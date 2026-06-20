import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type { Message, ChatConfig, MessageState } from '@/types/chat'
import { ChatService } from '@/services/chat.service'
import { createMessageState, appendThinking, appendAnswer, transitionPhase } from '@/utils/message-state'
import { DEFAULT_MODEL } from '@/constants/models'
import { DEFAULT_VOICE } from '@/constants/voices'
import { ElMessage } from 'element-plus'

/**
 * 聊天状态管理 Store
 * 管理消息列表、消息状态、流式传输状态等
 */
export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([])
  const messageStates = ref<Map<string, MessageState>>(new Map())
  const streaming = ref(false)
  const streamingMessageId = ref<string | null>(null)
  const currentConversationId = ref<string | null>(null)
  const abortController = ref<AbortController | null>(null)

  /** 聊天配置 */
  const config = ref<ChatConfig>({
    model: DEFAULT_MODEL,
    thinking: true,
    webSearch: false,
  })

  /** 选中的语音 */
  const selectedVoice = ref<string>(
    localStorage.getItem('selectedVoice') || DEFAULT_VOICE,
  )

  const currentMessages = computed(() => messages.value)

  /**
   * 获取消息状态
   * @param messageId 消息 ID
   * @returns 消息状态对象
   */
  function getMessageState(messageId: string): MessageState {
    return messageStates.value.get(messageId) || createMessageState()
  }

  /**
   * 发送消息
   * @param content 消息内容
   * @param attachments 附件列表（可选）
   */
  async function sendMessage(content: string, attachments?: any[]) {
    if (streaming.value) return
    if (!content.trim() && (!attachments || attachments.length === 0)) return

    // 检查是否有图片附件，自动切换模型
    const hasImages = attachments?.some(a => a.type === 'image')
    let useModel = config.value.model
    if (hasImages && config.value.model === 'mimo-v2.5-pro') {
      useModel = 'mimo-v2.5'
      ElMessage.info('图片消息自动切换至 MiMo-V2.5 模型')
    }

    // 添加用户消息
    const userMsg: Message = {
      id: nanoid(),
      conversationId: currentConversationId.value || '',
      role: 'user',
      content,
      attachments: attachments || null,
      createdAt: new Date().toISOString(),
    }
    messages.value.push(userMsg)

    // 创建助手消息占位
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

    // 初始化消息状态
    const state = createMessageState()
    const newStates = new Map(messageStates.value)
    newStates.set(assistantMsgId, state)
    messageStates.value = newStates
    streamingMessageId.value = assistantMsgId
    streaming.value = true

    // 创建 AbortController 以支持取消流式传输
    const controller = new AbortController()
    abortController.value = controller

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
            // 同时更新消息对象
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
              tools.set(id, { ...tool, progress: message })
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
            // 如果是新会话，更新会话 ID
            if (conversationId && !currentConversationId.value) {
              currentConversationId.value = conversationId
            }
            // 更新消息的会话 ID
            const idx = messages.value.findIndex(m => m.id === assistantMsgId)
            if (idx !== -1) {
              messages.value[idx].conversationId = currentConversationId.value || ''
            }

            // 清空活跃工具
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
        controller.signal,
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

      // 恢复包含思考过程或工具调用的消息状态
      const newStates = new Map(messageStates.value)
      for (const msg of loadedMessages) {
        if (msg.role === 'assistant' && (msg.thinking || msg.toolCalls)) {
          const activeTools = new Map<string, { name: string; state: 'running' | 'done' | 'error'; result?: string }>()

          if (msg.toolCalls && Array.isArray(msg.toolCalls)) {
            for (const tc of msg.toolCalls) {
              activeTools.set(tc.id || tc.name, {
                name: tc.name || 'unknown',
                state: 'done',
                result: tc.result,
              })
            }
          }

          newStates.set(msg.id, {
            phase: 'idle',
            thinkingContent: msg.thinking || '',
            answerContent: msg.content || '',
            activeTools,
          })
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
      messageStates.value = new Map()
    }
  }

  function newConversation() {
    currentConversationId.value = null
    messages.value = []
    messageStates.value = new Map()
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
