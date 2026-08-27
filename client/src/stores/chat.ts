import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type { Message, ChatConfig, MessageState } from '@/types/chat'
import { ChatService } from '@/services/chat.service'
import { createMessageState, appendThinking, appendAnswer, transitionPhase } from '@/utils/message-state'
import { DEFAULT_MODEL } from '@/constants/models'
import { DEFAULT_VOICE } from '@/constants/voices'
import { useConversationStore } from '@/stores/conversation'
import { MessageService } from '@/services/message.service'
import { ElMessage, ElMessageBox } from 'element-plus'

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
  /** 正在编辑的用户消息 ID */
  const editingMessageId = ref<string | null>(null)

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
          onComplete(messageId, conversationId, userMessageId) {
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

            // 采纳服务端消息 ID（最后执行：complete 是流式结束前的最后一个数据事件，
            // 此后不会再触发 onThinking/onAnswer 等回调，它们仍按乐观 nanoid ID 查找，
            // 因此重命名必须在所有流式回调结束后进行）
            if (userMessageId) {
              const uIdx = messages.value.findIndex(m => m.id === userMsg.id)
              if (uIdx !== -1) {
                messages.value[uIdx].id = userMessageId
                messages.value[uIdx].conversationId = currentConversationId.value || ''
              }
            }
            if (messageId && messageId !== assistantMsgId) {
              const aIdx = messages.value.findIndex(m => m.id === assistantMsgId)
              if (aIdx !== -1) {
                messages.value[aIdx].id = messageId
                messages.value[aIdx].conversationId = currentConversationId.value || ''
              }
              // 状态 Map 的键跟随迁移，避免按消息 ID 查找状态时丢失
              const stateMap = new Map(messageStates.value)
              const st = stateMap.get(assistantMsgId)
              if (st) {
                stateMap.delete(assistantMsgId)
                stateMap.set(messageId, st)
              }
              messageStates.value = stateMap
              // 保持流式标记指向新 ID，直至 finally 统一清理
              if (streamingMessageId.value === assistantMsgId) {
                streamingMessageId.value = messageId
              }
            }
          },
          onTitle(conversationId, title) {
            // AI 生成的会话标题: 立即更新侧边栏, 无需重新拉取
            useConversationStore().renameConversationLocally(conversationId, title)
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
      const aborted = controller.signal.aborted || err?.name === 'AbortError'
      const idx = messages.value.findIndex(m => m.id === assistantMsgId)
      if (idx !== -1) {
        if (aborted) {
          // 用户主动中断：保留已生成的部分内容；一个字都没生成则移除空占位
          if (messages.value[idx].content) {
            const stateMap = new Map(messageStates.value)
            stateMap.set(assistantMsgId, { ...getMessageState(assistantMsgId), phase: 'idle', activeTools: new Map() })
            messageStates.value = stateMap
          } else {
            messages.value.splice(idx, 1)
            const stateMap = new Map(messageStates.value)
            stateMap.delete(assistantMsgId)
            messageStates.value = stateMap
          }
          ElMessage.info('已停止生成')
        } else {
          messages.value[idx].content = `发送失败: ${err.message}`
        }
      }
    } finally {
      streaming.value = false
      streamingMessageId.value = null
    }
  }

  /** 开始编辑用户消息 */
  function startEdit(id: string) {
    if (streaming.value) {
      ElMessage.warning('请等待当前回复完成')
      return
    }
    editingMessageId.value = id
  }

  /** 取消编辑用户消息 */
  function cancelEdit() {
    editingMessageId.value = null
  }

  /** 从 fromIndex（含）开始截断本地消息，并清理对应的 MessageState */
  function truncateLocal(fromIndex: number) {
    const removed = messages.value.splice(fromIndex)
    if (removed.length > 0) {
      const stateMap = new Map(messageStates.value)
      for (const m of removed) {
        stateMap.delete(m.id)
      }
      messageStates.value = stateMap
    }
  }

  /** 截断前确认：有后续消息时提示将被删除的数量 */
  async function confirmTruncate(count: number, action: string): Promise<boolean> {
    try {
      await ElMessageBox.confirm(`${action}将删除其后的 ${count} 条消息，是否继续？`, '提示', {
        confirmButtonText: '继续',
        cancelButtonText: '取消',
        type: 'warning',
      })
      return true
    } catch {
      return false
    }
  }

  /** 服务端删除失败提示（404 时为服务端返回的『部分消息不存在或无权删除』等消息） */
  function showDeleteError(err: any) {
    ElMessage.error(err?.response?.data?.message || '删除消息失败')
  }

  /**
   * 重新生成助手回复（经典截断模型）：
   * 删除 [前置用户消息, 该助手消息, ...其后所有消息] 后，按原内容+原附件重发
   */
  async function regenerateMessage(assistantMsgId: string) {
    if (streaming.value) {
      ElMessage.warning('请等待当前回复完成')
      return
    }
    const assistantIdx = messages.value.findIndex(
      m => m.id === assistantMsgId && m.role === 'assistant',
    )
    if (assistantIdx === -1) return

    // 向前查找最近一条用户消息
    let userIdx = -1
    for (let i = assistantIdx - 1; i >= 0; i--) {
      if (messages.value[i].role === 'user') {
        userIdx = i
        break
      }
    }
    if (userIdx === -1) {
      ElMessage.error('未找到对应的用户消息')
      return
    }
    const userMsg = messages.value[userIdx]

    // 若助手消息之后还有消息，需要用户确认截断
    const trailingCount = messages.value.length - assistantIdx - 1
    if (trailingCount > 0 && !(await confirmTruncate(trailingCount, '重新生成'))) return

    try {
      await MessageService.deleteBatch(messages.value.slice(userIdx).map(m => m.id))
    } catch (err: any) {
      showDeleteError(err)
      return
    }

    truncateLocal(userIdx)
    await sendMessage(userMsg.content, userMsg.attachments || undefined)
    useConversationStore().fetchConversations()
  }

  /**
   * 编辑用户消息（经典截断模型）：
   * 删除 [该用户消息, ...其后所有消息] 后，以新内容+原附件重发
   */
  async function editUserMessage(userMsgId: string, newContent: string) {
    if (streaming.value) {
      ElMessage.warning('请等待当前回复完成')
      return
    }
    const content = newContent.trim()
    if (!content) return

    const userIdx = messages.value.findIndex(m => m.id === userMsgId && m.role === 'user')
    if (userIdx === -1) return
    const userMsg = messages.value[userIdx]

    const trailingCount = messages.value.length - userIdx - 1
    if (trailingCount > 0 && !(await confirmTruncate(trailingCount, '编辑'))) return

    try {
      await MessageService.deleteBatch(messages.value.slice(userIdx).map(m => m.id))
    } catch (err: any) {
      showDeleteError(err)
      return
    }

    editingMessageId.value = null
    truncateLocal(userIdx)
    await sendMessage(content, userMsg.attachments || undefined)
    useConversationStore().fetchConversations()
  }

  async function loadMessages(conversationId: string) {
    currentConversationId.value = conversationId
    editingMessageId.value = null
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
      editingMessageId.value = null
    }
  }

  function newConversation() {
    currentConversationId.value = null
    messages.value = []
    messageStates.value = new Map()
    editingMessageId.value = null
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
    editingMessageId,
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
    startEdit,
    cancelEdit,
    regenerateMessage,
    editUserMessage,
  }
})
