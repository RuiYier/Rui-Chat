import api from './api'

export const VoiceService = {
  async speechToText(audioBlob: Blob, language: string = 'auto'): Promise<string> {
    const formData = new FormData()
    formData.append('file', audioBlob, 'recording.webm')
    formData.append('language', language)

    const { data } = await api.post('/voice/stt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    })

    return data.text
  },

  async textToSpeech(
    text: string,
    voice: string = 'mimo_default',
    format: string = 'wav',
    style?: string,
  ): Promise<Blob> {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/voice/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text, voice, format, style }),
    })

    if (!response.ok) {
      throw new Error('语音合成失败')
    }

    return response.blob()
  },

  /**
   * 流式语音合成: 返回原始 PCM16 LE 单声道 24kHz 二进制流
   */
  async textToSpeechStream(
    text: string,
    voice?: string,
    style?: string,
    signal?: AbortSignal,
  ): Promise<ReadableStream<Uint8Array>> {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/voice/tts/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text, voice, style }),
      signal,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new Error(error?.message || '语音播放失败')
    }

    return response.body!
  },
}
