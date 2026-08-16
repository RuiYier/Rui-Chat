import { Controller, Post, Body, UseGuards, Res, UploadedFile, UseInterceptors, BadRequestException, ForbiddenException } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { VoiceService } from './voice.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { SettingsService } from '../settings/settings.service'
import { TextToSpeechDto } from './dto/tts.dto'
import { Response } from 'express'

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
    @Res() res: Response,
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
}
