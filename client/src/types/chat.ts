export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  thinking?: string | null
  toolCalls?: any[] | null
  toolResults?: any[] | null
  attachments?: FileAttachment[] | null
  createdAt: string
}

export interface FileAttachment {
  name: string
  content: string
  size: number
}

export type MessagePhase = 'idle' | 'thinking' | 'tool_calling' | 'answering' | 'error'

export interface MessageState {
  phase: MessagePhase
  thinkingContent: string
  answerContent: string
  activeTools: Map<string, { name: string; state: 'running' | 'done' | 'error'; result?: string }>
}

export interface ChatConfig {
  model: string
  thinking: boolean
  webSearch: boolean
}

export interface Conversation {
  id: string
  title: string
  isPinned: boolean
  pinnedAt?: string | null
  isShared: boolean
  createdAt: string
  updatedAt: string
  _count?: { messages: number }
}
