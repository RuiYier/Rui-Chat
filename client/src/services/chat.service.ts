import type { Message, ChatConfig } from '@/types/chat'

export interface SSECallbacks {
  onThinking?: (content: string) => void
  onAnswer?: (content: string) => void
  onToolCall?: (id: string, name: string, args: string) => void
  onToolProgress?: (id: string, progress: number, message: string) => void
  onToolResult?: (id: string, result: string) => void
  onComplete?: (messageId: string, conversationId?: string) => void
  onError?: (message: string) => void
}

export const ChatService = {
  async sendMessage(
    content: string,
    config: ChatConfig,
    conversationId?: string,
    attachments?: any[],
    callbacks?: SSECallbacks,
  ): Promise<void> {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('未登录')

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content,
        conversationId,
        model: config.model,
        thinking: config.thinking,
        webSearch: config.webSearch,
        attachments,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '请求失败' }))
      throw new Error(error.message || '请求失败')
    }

    // Parse SSE stream
    const reader = response.body?.getReader()
    if (!reader) throw new Error('无法读取响应')

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
          if (data === '[DONE]') return

          try {
            const parsed = JSON.parse(data)

            switch (parsed.type) {
              case 'thinking':
                callbacks?.onThinking?.(parsed.content)
                break
              case 'answer':
                callbacks?.onAnswer?.(parsed.content)
                break
              case 'tool_call':
                callbacks?.onToolCall?.(parsed.id, parsed.name, parsed.arguments)
                break
              case 'tool_progress':
                callbacks?.onToolProgress?.(parsed.id, parsed.progress, parsed.message)
                break
              case 'tool_result':
                callbacks?.onToolResult?.(parsed.id, parsed.result)
                break
              case 'complete':
                callbacks?.onComplete?.(parsed.messageId, parsed.conversationId)
                break
              case 'error':
                callbacks?.onError?.(parsed.message)
                break
            }
          } catch {
            // Skip unparseable
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  },

  async loadMessages(conversationId: string): Promise<Message[]> {
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/messages/conversation/${conversationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('加载消息失败')
    return response.json()
  },
}
