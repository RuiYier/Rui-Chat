import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type { Message, ChatConfig, MessageState } from '@/types/chat'
import { ChatService } from '@/services/chat.service'
import { createMessageState, appendThinking, appendAnswer, transitionPhase } from '@/utils/message-state'
import { DEFAULT_MODEL } from '@/constants/models'
import { DEFAULT_VOICE } from '@/constants/voices'
import { ElMessage } from 'element-plus'

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
    if (streaming.value) return
    if (!content.trim() && (!attachments || attachments.length === 0)) return

    // Performance: mark start time
    const perfStart = performance.now()
    console.log(`[Perf] sendMessage start: ${perfStart.toFixed(2)}ms`)

    // Check if image attachments exist and auto-switch model
    const hasImages = attachments?.some(a => a.type === 'image')
    let useModel = config.value.model
    if (hasImages && config.value.model === 'mimo-v2.5-pro') {
      useModel = 'mimo-v2.5'
      ElMessage.info('图片消息自动切换至 MiMo-V2.5 模型')
    }

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

    // Performance: first frame rendered (placeholder created)
    const firstFrame = performance.now()
    console.log(`[Perf] First frame (placeholder): ${(firstFrame - perfStart).toFixed(2)}ms`)
    console.log(`[Perf] NanoID generation + Vue reactivity: ${(firstFrame - perfStart).toFixed(2)}ms`)
    let firstTokenReceived = false

    try {
      await ChatService.sendMessage(
        content,
        { ...config.value, model: useModel },
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
            // Performance: first token received
            if (!firstTokenReceived) {
              firstTokenReceived = true
              const firstToken = performance.now()
              console.log(`[Perf] First token received: ${(firstToken - perfStart).toFixed(2)}ms`)
              console.log(`[Perf] Time from placeholder to first token: ${(firstToken - firstFrame).toFixed(2)}ms`)
            }

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
            // Performance: stream complete
            const streamEnd = performance.now()
            console.log(`[Perf] Stream complete: ${(streamEnd - perfStart).toFixed(2)}ms total`)
            console.log(`[Perf] Summary:`)
            console.log(`  - First frame (placeholder): ${(firstFrame - perfStart).toFixed(2)}ms`)
            console.log(`  - First token: ${(streamEnd - perfStart).toFixed(2)}ms`)
            console.log(`  - Model: ${useModel}`)

            // Update conversationId from server if new conversation
            if (conversationId && !currentConversationId.value) {
              currentConversationId.value = conversationId
            }
            // Update message conversationId
            const idx = messages.value.findIndex(m => m.id === assistantMsgId)
            if (idx !== -1) {
              messages.value[idx].conversationId = currentConversationId.value || ''
            }

            // Clear active tools after stream completes
            const s = getMessageState(assistantMsgId)
            const newStates = new Map(messageStates.value)
            newStates.set(assistantMsgId, { ...s, activeTools: new Map() })
            messageStates.value = newStates
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
      const loadedMessages = await ChatService.loadMessages(conversationId)
      messages.value = loadedMessages

      // Initialize message states for messages with thinking or tool calls
      const newStates = new Map(messageStates.value)
      for (const msg of loadedMessages) {
        if (msg.role === 'assistant' && (msg.thinking || msg.toolCalls)) {
          const activeTools = new Map<string, { name: string; state: 'running' | 'done' | 'error'; result?: string }>()

          // Restore tool calls from database
          if (msg.toolCalls && Array.isArray(msg.toolCalls)) {
            for (const tc of msg.toolCalls) {
              activeTools.set(tc.id || tc.name, {
                name: tc.name || 'unknown',
                state: 'done',
                result: tc.result,
              })
            }
          }

          const state: MessageState = {
            phase: 'idle',
            thinkingContent: msg.thinking || '',
            answerContent: msg.content || '',
            activeTools,
          }
          newStates.set(msg.id, state)
        }
      }
      messageStates.value = newStates
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
