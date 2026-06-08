import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<{ type: string; [key: string]: any }>
}

export interface ChatCompletionOptions {
  model: string
  messages: ChatMessage[]
  stream?: boolean
  temperature?: number
  max_tokens?: number
  tools?: any[]
  enableThinking?: boolean
  audio?: { format: string; voice?: string; [key: string]: any }
  asr_options?: { language?: string }
}

@Injectable()
export class AiService {
  private baseUrl: string
  private apiKey: string

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('MIMO_BASE_URL', 'https://token-plan-cn.xiaomimimo.com/v1')
    this.apiKey = this.configService.get<string>('MIMO_API_KEY', '')
  }

  async chatCompletion(options: ChatCompletionOptions): Promise<Response> {
    const url = `${this.baseUrl}/chat/completions`

    const body: any = {
      model: options.model,
      messages: options.messages,
      stream: options.stream ?? false,
    }

    if (options.temperature !== undefined) body.temperature = options.temperature
    if (options.max_tokens !== undefined) body.max_tokens = options.max_tokens
    if (options.tools && options.tools.length > 0) body.tools = options.tools
    if (options.enableThinking !== undefined) body.thinking = { type: options.enableThinking ? 'enabled' : 'disabled' }
    if (options.audio) body.audio = options.audio
    if (options.asr_options) body.asr_options = options.asr_options

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })
  }

  async speechToText(audioBase64: string, mimeType: string, language: string = 'auto'): Promise<string> {
    const response = await this.chatCompletion({
      model: 'mimo-v2.5-asr',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: { data: `data:${mimeType};base64,${audioBase64}` },
            },
          ],
        },
      ],
      asr_options: { language },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`ASR failed: ${error}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  }

  async textToSpeech(
    text: string,
    voice: string = 'mimo_default',
    format: string = 'wav',
    styleInstruction?: string,
  ): Promise<Buffer> {
    const messages: ChatMessage[] = []

    if (styleInstruction) {
      messages.push({ role: 'user', content: styleInstruction })
    }

    messages.push({ role: 'assistant', content: text })

    const response = await this.chatCompletion({
      model: 'mimo-v2.5-tts',
      messages,
      audio: { format, voice },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`TTS failed: ${error}`)
    }

    const data = await response.json()
    const audioData = data.choices?.[0]?.message?.audio?.data
    if (!audioData) throw new Error('No audio data in TTS response')

    return Buffer.from(audioData, 'base64')
  }
}
