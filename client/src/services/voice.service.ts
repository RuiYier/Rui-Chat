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
}
