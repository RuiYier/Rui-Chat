import { SSEWriter } from './sse-writer'
import { AiService } from './ai.service'
import { MessagePersister } from './message-persister'
import { ToolRegistry } from '../tools/tool-registry'
import { ToolHandler } from '../tools/tool-handler'

export interface StreamOptions {
  model: string
  baseUrl?: string
  apiKey?: string
  messages: any[]
  tools?: any[]
  temperature?: number
  maxTokens?: number
  enableThinking?: boolean
}

export async function handleStream(
  aiService: AiService,
  persister: MessagePersister,
  toolRegistry: ToolRegistry,
  sseWriter: SSEWriter,
  assistantMessageId: string,
  options: StreamOptions & { conversationId?: string },
) {
  const { model, tools, temperature, maxTokens, enableThinking } = options
  let messages = [...options.messages]
  const maxRounds = 5 // Maximum tool call rounds
  let fullContent = ''
  let fullThinking = ''

  for (let round = 0; round < maxRounds; round++) {
    console.log(`[Tool] Round ${round + 1}/${maxRounds}`)

    // Build request body for AI
    const requestBody: any = {
      model,
      messages,
      stream: true,
      temperature: temperature ?? 0.7,
      max_tokens: maxTokens ?? 8192,
      enableThinking,
    }

    // Add tools if available
    const toolDefinitions = tools && tools.length > 0
      ? toolRegistry.getToolDefinitions().filter(t => tools.some((nt: string) => nt === t.function.name))
      : []

    if (toolDefinitions.length > 0) {
      requestBody.tools = toolDefinitions
    }

    // Call AI API (baseUrl/apiKey 仅作为调用参数传入，不进入上游请求体)
    const response = await aiService.chatCompletion({
      ...requestBody,
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
    })

    if (!response.ok) {
      const errorText = await response.text()
      sseWriter.error(`AI API error: ${errorText}`)
      return
    }

    // Process SSE stream
    const reader = response.body?.getReader()
    if (!reader) {
      sseWriter.error('No response body')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let hasToolCalls = false
    const toolCallsBuffer: Map<string, { id: string; name: string; arguments: string }> = new Map()
    let assistantToolCalls: any[] = []
    const toolResults: any[] = []

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
          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data)
            const choice = parsed.choices?.[0]
            if (!choice) continue

            const delta = choice.delta

            // Handle reasoning_content (thinking)
            if (delta?.reasoning_content) {
              fullThinking += delta.reasoning_content
              sseWriter.sendThinking(delta.reasoning_content)
            }

            // Handle regular content
            if (delta?.content) {
              fullContent += delta.content
              sseWriter.sendAnswer(delta.content)
            }

            // Handle tool calls
            if (delta?.tool_calls) {
              hasToolCalls = true
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0
                if (!toolCallsBuffer.has(`tc_${idx}`)) {
                  toolCallsBuffer.set(`tc_${idx}`, {
                    id: tc.id || `call_${idx}`,
                    name: tc.function?.name || '',
                    arguments: '',
                  })
                }
                const existing = toolCallsBuffer.get(`tc_${idx}`)!
                if (tc.id) existing.id = tc.id
                if (tc.function?.name) existing.name = tc.function.name
                if (tc.function?.arguments) existing.arguments += tc.function.arguments

                sseWriter.sendToolCall(existing.id, existing.name, tc.function?.arguments || '')
              }
            }

            // Handle finish reason
            if (choice.finish_reason === 'tool_calls') {
              // Execute tools
              const toolCalls = Array.from(toolCallsBuffer.values())
              const toolHandler = new ToolHandler(toolRegistry)
              console.log(`[Tool] Executing ${toolCalls.length} tool calls:`, toolCalls.map(t => t.name))

              for (const tc of toolCalls) {
                sseWriter.sendToolProgress(tc.id, 10, `正在执行 ${tc.name}...`)

                try {
                  const result = await toolHandler.executeToolCall(tc.id, tc.name, tc.arguments)
                  sseWriter.sendToolResult(tc.id, result.content)
                  toolResults.push({ id: tc.id, name: tc.name, result: result.content })
                } catch (err: any) {
                  sseWriter.sendToolResult(tc.id, `工具执行失败: ${err.message}`)
                  toolResults.push({ id: tc.id, name: tc.name, result: `工具执行失败: ${err.message}` })
                }
              }

              assistantToolCalls = toolCalls
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    // If there were tool calls, add to messages and continue conversation
    if (hasToolCalls && assistantToolCalls.length > 0) {
      console.log(`[Tool] Adding ${assistantToolCalls.length} tool calls and ${toolResults.length} results to messages`)

      // Add assistant message with tool_calls
      messages.push({
        role: 'assistant',
        content: fullContent || null,
        tool_calls: assistantToolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: tc.arguments },
        })),
      })

      // Add tool results
      for (const tr of toolResults) {
        messages.push({
          role: 'tool',
          tool_call_id: tr.id,
          content: tr.result,
        })
      }

      // Save tool calls and results to message
      await persister.updateToolCalls(assistantMessageId, assistantToolCalls)
      await persister.updateToolResults(
        assistantMessageId,
        assistantToolCalls.map(tc => ({ id: tc.id, name: tc.name, result: 'executed' })),
      )

      // Continue to next round
      continue
    }

    // No tool calls, we're done
    console.log('[Tool] No more tool calls, stream complete')
    break
  }

  // Save final content
  if (fullThinking) {
    await persister.updateMessageThinking(assistantMessageId, fullThinking)
  }
  if (fullContent) {
    await persister.updateMessageContent(assistantMessageId, fullContent)
  }

  // 先发送完成信号，让客户端立即停止加载动画，再进行标题生成
  sseWriter.sendComplete(assistantMessageId, options.conversationId)

  // 阶段 B：首个回合完成后用 AI 生成精简标题（任何异常都不允许影响流）
  try {
    if (options.conversationId && fullContent) {
      // getMessageHistory 带 take 限制无法判断回合数，需以消息总数判断是否为首回合
      const messageCount = await persister.countMessages(options.conversationId)
      if (messageCount <= 2) {
        const history = await persister.getMessageHistory(options.conversationId, 2)
        const firstUserMessage = history.find(m => m.role === 'user')?.content || ''
        const title = await generateConversationTitle(aiService, options, firstUserMessage, fullContent)
        if (title) {
          await persister.updateConversationTitle(options.conversationId, title)
          sseWriter.sendTitle(options.conversationId, title)
        }
      }
    }
  } catch (err) {
    console.error('[Title] Failed to generate conversation title:', err)
  }

  sseWriter.close()
}

/**
 * 用 AI 为首个回合生成简短会话标题
 * 任何失败（网络错误、非 2xx、空结果）都回退到用户输入的截断标题
 */
async function generateConversationTitle(
  aiService: AiService,
  options: { model: string; baseUrl?: string; apiKey?: string },
  firstUserMessage: string,
  assistantContent: string,
): Promise<string> {
  const fallback = firstUserMessage.slice(0, 30).replace(/\n/g, ' ')

  try {
    const response = await aiService.chatCompletion({
      model: options.model,
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
      stream: false,
      max_tokens: 50,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: '你是一个对话标题生成器。根据用户的问题和AI的回答，生成一个简短的标题（15字以内）。只输出标题本身，不要包含引号或任何其他内容。',
        },
        {
          role: 'user',
          content: `用户问题：${firstUserMessage}\n\nAI回答：${assistantContent.slice(0, 500)}`,
        },
      ],
    })

    if (!response.ok) return fallback

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content
    if (typeof raw !== 'string') return fallback

    const title = raw
      .trim()
      .replace(/^[「」『』“”‘'"]+|[「」『』“”‘'"]+$/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 30)
      .trim()

    return title || fallback
  } catch {
    return fallback
  }
}
