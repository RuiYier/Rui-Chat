import { Controller, Post, Body, UseGuards, Res, UploadedFile, UseInterceptors, BadRequestException, ForbiddenException } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { VoiceService } from './voice.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { SettingsService } from '../settings/settings.service'
import { TextToSpeechDto } from './dto/tts.dto'
import { Response as ExpressResponse } from 'express'

@Controller('voice')
export class VoiceController {
  constructor(
    private voiceService: VoiceService,
    private settingsService: SettingsService,
  ) {}

  @Post('stt')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async speechToText(
    @UploadedFile() file: Express.Multer.File,
    @Body('language') language?: string,
  ) {
    const settings = await this.settingsService.getSettings()
    if (!settings.enableVoiceInput) {
      throw new ForbiddenException('语音输入已被管理员禁用')
    }

    if (!file) {
      throw new BadRequestException('请上传音频文件')
    }

    const text = await this.voiceService.speechToText(file.buffer, file.mimetype, language || 'auto')
    return { text }
  }

  @Post('tts')
  @UseGuards(JwtAuthGuard)
  async textToSpeech(
    @Body() body: TextToSpeechDto,
    @Res() res: ExpressResponse,
  ) {
    const settings = await this.settingsService.getSettings()
    if (!settings.enableTts) {
      throw new ForbiddenException('语音合成已被管理员禁用')
    }

    const audioBuffer = await this.voiceService.textToSpeech(
      body.text,
      body.voice,
      body.format || 'wav',
      body.style,
    )

    const format = body.format || 'wav'
    const mimeMap: Record<string, string> = {
      wav: 'audio/wav',
      mp3: 'audio/mpeg',
      pcm: 'audio/pcm',
    }

    res.set({
      'Content-Type': mimeMap[format] || 'audio/wav',
      'Content-Length': audioBuffer.length.toString(),
      'Content-Disposition': `inline; filename="tts.${format}"`,
    })
    res.send(audioBuffer)
  }

  @Post('tts/stream')
  @UseGuards(JwtAuthGuard)
  async streamTextToSpeech(
    @Body() body: TextToSpeechDto,
    @Res() res: ExpressResponse,
  ) {
    const settings = await this.settingsService.getSettings()
    if (!settings.enableTts) {
      throw new ForbiddenException('语音合成已被管理员禁用')
    }

    let upstream: Response
    try {
      upstream = await this.voiceService.streamTextToSpeech(
        body.text,
        body.voice || 'mimo_default',
        body.style,
      )
    } catch {
      res.status(502).json({ message: '语音合成服务不可用' })
      return
    }

    if (!upstream.ok) {
      await upstream.text().catch(() => '')
      res.status(502).json({ message: '语音合成服务不可用' })
      return
    }

    // 输出为原始 PCM16（小端）、24kHz、单声道
    res.status(200)
    res.set({
      'Content-Type': 'application/octet-stream',
      'X-Audio-Format': 'pcm16',
      'X-Sample-Rate': '24000',
      'X-Channels': '1',
      'Cache-Control': 'no-cache',
    })

    const reader = upstream.body?.getReader()
    if (!reader) {
      res.end()
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const b64 = parsed.choices?.[0]?.delta?.audio?.data
            if (typeof b64 === 'string' && b64.length > 0) {
              res.write(Buffer.from(b64, 'base64'))
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
    } finally {
      reader.releaseLock()
      res.end()
    }
  }
}
