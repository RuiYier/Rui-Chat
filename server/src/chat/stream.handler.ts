import { SSEWriter } from './sse-writer'
import { AiService } from './ai.service'
import { MessagePersister } from './message-persister'
import { ToolRegistry } from '../tools/tool-registry'
import { ToolHandler } from '../tools/tool-handler'

export interface StreamOptions {
  model: string
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

    // Call AI API
    const response = await aiService.chatCompletion(requestBody)

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

  // Auto-generate title from first message
  if (options.conversationId && fullContent) {
    const history = await persister.getMessageHistory(options.conversationId, 2)
    if (history.length <= 2) {
      const title = fullContent.slice(0, 50).replace(/\n/g, ' ')
      await persister.updateConversationTitle(options.conversationId, title)
    }
  }

  sseWriter.sendComplete(assistantMessageId, options.conversationId)
  sseWriter.close()
}
