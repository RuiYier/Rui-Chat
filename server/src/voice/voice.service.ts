import { Injectable, BadRequestException } from '@nestjs/common'
import { AiService } from '../chat/ai.service'

@Injectable()
export class VoiceService {
  constructor(private aiService: AiService) {}

  async speechToText(audioBuffer: Buffer, mimeType: string, language: string = 'auto') {
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (audioBuffer.length > maxSize) {
      throw new BadRequestException('音频文件大小不能超过 10MB')
    }

    const supportedMimes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg']
    if (!supportedMimes.some(m => mimeType.startsWith(m.split('/')[0]))) {
      throw new BadRequestException('不支持的音频格式')
    }

    const base64 = audioBuffer.toString('base64')
    return this.aiService.speechToText(base64, mimeType, language)
  }

  async textToSpeech(text: string, voice: string = 'mimo_default', format: string = 'wav', style?: string) {
    if (!text || text.trim().length === 0) {
      throw new BadRequestException('文本不能为空')
    }

    return this.aiService.textToSpeech(text, voice, format, style)
  }
}
