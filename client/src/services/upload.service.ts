import api from './api'

export const UploadService = {
  async uploadFile(file: File): Promise<{ name: string; content: string; size: number }> {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return data
  },
}
