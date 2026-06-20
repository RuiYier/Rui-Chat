import { Controller, Post, Body, UseGuards, Res, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { VoiceService } from './voice.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { TextToSpeechDto } from './dto/tts.dto'
import { Response } from 'express'

@Controller('voice')
export class VoiceController {
  constructor(private voiceService: VoiceService) {}

  @Post('stt')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async speechToText(
    @UploadedFile() file: Express.Multer.File,
    @Body('language') language?: string,
  ) {
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
