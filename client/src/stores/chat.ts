import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type { Message, ChatConfig, MessageState } from '@/types/chat'
import { ChatService } from '@/services/chat.service'
import { createMessageState, appendThinking, appendAnswer, transitionPhase } from '@/utils/message-state'
import { DEFAULT_MODEL } from '@/constants/models'
import { DEFAULT_VOICE } from '@/constants/voices'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([])
  const messageStates = ref<Map<string, MessageState>>(new Map())
  const streaming = ref(false)
  const streamingMessageId = ref<string | null>(null)
  const currentConversationId = ref<string | null>(null)
  const abortController = ref<AbortController | null>(null)

  const config = ref<ChatConfig>({
    model: DEFAULT_MODEL,
    thinking: true,
    webSearch: false,
  })

  const selectedVoice = ref<string>(
    localStorage.getItem('selectedVoice') || DEFAULT_VOICE,
  )

  const currentMessages = computed(() => messages.value)

  function getMessageState(messageId: string): MessageState {
    return messageStates.value.get(messageId) || createMessageState()
  }

  async function sendMessage(content: string, attachments?: any[]) {
    if (streaming.value || !content.trim()) return

    // Add user message
    const userMsg: Message = {
      id: nanoid(),
      conversationId: currentConversationId.value || '',
      role: 'user',
      content,
      attachments: attachments || null,
      createdAt: new Date().toISOString(),
    }
    messages.value.push(userMsg)

    // Create assistant message placeholder
    const assistantMsgId = nanoid()
    const assistantMsg: Message = {
      id: assistantMsgId,
      conversationId: currentConversationId.value || '',
      role: 'assistant',
      content: '',
      thinking: null,
      createdAt: new Date().toISOString(),
    }
    messages.value.push(assistantMsg)

    // Initialize state
    const state = createMessageState()
    const newStates = new Map(messageStates.value)
    newStates.set(assistantMsgId, state)
    messageStates.value = newStates
    streamingMessageId.value = assistantMsgId
    streaming.value = true

    try {
      await ChatService.sendMessage(
        content,
        config.value,
        currentConversationId.value || undefined,
        attachments,
        {
          onThinking(thinkingContent) {
            const s = getMessageState(assistantMsgId)
            const newStates = new Map(messageStates.value)
            newStates.set(assistantMsgId, appendThinking(s, thinkingContent))
            messageStates.value = newStates
            // Also update the message
            const idx = messages.value.findIndex(m => m.id === assistantMsgId)
            if (idx !== -1) {
              messages.value[idx].thinking = (messages.value[idx].thinking || '') + thinkingContent
            }
          },
          onAnswer(answerContent) {
            const s = getMessageState(assistantMsgId)
            let updated = s
            if (s.phase === 'idle' || s.phase === 'thinking') {
              updated = transitionPhase(s, 'answering')
            }
            updated = appendAnswer(updated, answerContent)
            const newStates = new Map(messageStates.value)
            newStates.set(assistantMsgId, updated)
            messageStates.value = newStates
            const idx = messages.value.findIndex(m => m.id === assistantMsgId)
            if (idx !== -1) {
              messages.value[idx].content += answerContent
            }
          },
          onToolCall(id, name) {
            const s = getMessageState(assistantMsgId)
            const tools = new Map(s.activeTools)
            tools.set(id, { name, state: 'running' })
            const newStates = new Map(messageStates.value)
            newStates.set(assistantMsgId, {
              ...transitionPhase(s, 'tool_calling'),
              activeTools: tools,
            })
            messageStates.value = newStates
          },
          onToolProgress(id, _progress, message) {
            const s = getMessageState(assistantMsgId)
            const tools = new Map(s.activeTools)
            const tool = tools.get(id)
            if (tool) {
              tools.set(id, { ...tool, name: tool.name + ` (${message})` })
              const newStates = new Map(messageStates.value)
              newStates.set(assistantMsgId, { ...s, activeTools: tools })
              messageStates.value = newStates
            }
          },
          onToolResult(id, result) {
            const s = getMessageState(assistantMsgId)
            const tools = new Map(s.activeTools)
            const tool = tools.get(id)
            if (tool) {
              tools.set(id, { ...tool, state: 'done', result })
              const newStates = new Map(messageStates.value)
              newStates.set(assistantMsgId, { ...s, activeTools: tools })
              messageStates.value = newStates
            }
          },
          onComplete(messageId, conversationId) {
            // Update conversationId from server if new conversation
            if (conversationId && !currentConversationId.value) {
              currentConversationId.value = conversationId
            }
            // Update message conversationId
            const idx = messages.value.findIndex(m => m.id === assistantMsgId)
            if (idx !== -1) {
              messages.value[idx].conversationId = currentConversationId.value || ''
            }
          },
          onError(message) {
            const s = getMessageState(assistantMsgId)
            const newStates = new Map(messageStates.value)
            newStates.set(assistantMsgId, transitionPhase(s, 'error'))
            messageStates.value = newStates
            const idx = messages.value.findIndex(m => m.id === assistantMsgId)
            if (idx !== -1) {
              messages.value[idx].content = `错误: ${message}`
            }
          },
        },
      )
    } catch (err: any) {
      const idx = messages.value.findIndex(m => m.id === assistantMsgId)
      if (idx !== -1) {
        messages.value[idx].content = `发送失败: ${err.message}`
      }
    } finally {
      streaming.value = false
      streamingMessageId.value = null
    }
  }

  async function loadMessages(conversationId: string) {
    currentConversationId.value = conversationId
    try {
      messages.value = await ChatService.loadMessages(conversationId)
    } catch {
      messages.value = []
    }
  }

  function setConversation(id: string | null) {
    currentConversationId.value = id
    if (!id) {
      messages.value = []
      messageStates.value.clear()
    }
  }

  function newConversation() {
    currentConversationId.value = null
    messages.value = []
    messageStates.value.clear()
  }

  function setVoice(voice: string) {
    selectedVoice.value = voice
    localStorage.setItem('selectedVoice', voice)
  }

  function setModel(model: string) {
    config.value.model = model
  }

  function toggleThinking() {
    config.value.thinking = !config.value.thinking
  }

  function toggleWebSearch() {
    config.value.webSearch = !config.value.webSearch
  }

  function abortStream() {
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
    }
    streaming.value = false
    streamingMessageId.value = null
  }

  return {
    messages,
    messageStates,
    streaming,
    streamingMessageId,
    currentConversationId,
    config,
    selectedVoice,
    currentMessages,
    getMessageState,
    sendMessage,
    loadMessages,
    setConversation,
    newConversation,
    setVoice,
    setModel,
    toggleThinking,
    toggleWebSearch,
    abortStream,
  }
})
