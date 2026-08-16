import api from './api'
import type { Message } from '@/types/chat'

export const MessageService = {
  /** 更新消息内容（服务端校验所有权） */
  async updateMessage(id: string, data: { content: string }): Promise<Message> {
    const { data: message } = await api.put<Message>(`/messages/${id}`, data)
    return message
  },

  /** 批量删除消息（整体校验：任一 ID 无效或无权限则全部不删除，返回 404） */
  async deleteBatch(ids: string[]): Promise<{ success: boolean; deleted: number }> {
    const { data } = await api.delete<{ success: boolean; deleted: number }>('/messages/batch', {
      data: { ids },
    })
    return data
  },
}
