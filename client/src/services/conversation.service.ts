import api from './api'
import type { Conversation } from '@/types/chat'

export const ConversationService = {
  async getAll(): Promise<Conversation[]> {
    const { data } = await api.get('/conversations')
    return data
  },

  async create(title?: string): Promise<Conversation> {
    const { data } = await api.post('/conversations', { title })
    return data
  },

  async update(id: string, body: { title?: string; isPinned?: boolean }): Promise<Conversation> {
    const { data } = await api.patch(`/conversations/${id}`, body)
    return data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/conversations/${id}`)
  },

  async share(id: string): Promise<{ shareToken: string }> {
    const { data } = await api.post(`/conversations/${id}/share`)
    return data
  },

  async unshare(id: string): Promise<void> {
    await api.delete(`/conversations/${id}/share`)
  },
}
