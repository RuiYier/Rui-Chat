export interface PromptContext {
  hasWebSearch?: boolean
  hasImageUnderstanding?: boolean
  hasAudioUnderstanding?: boolean
  tools?: { name: string; description: string }[]
  attachments?: Array<{ name: string; content?: string; data?: string; type?: string; mimeType?: string }>
}

/** 历史上下文预算：最多携带的消息条数（chat.service 按此数从数据库取最近记录） */
export const HISTORY_MAX_MESSAGES = 50
/** 历史上下文预算：历史消息总字符数上限（粗略估算 token，防止少量长消息撑爆上下文） */
export const HISTORY_MAX_CHARS = 30000

/**
 * 从最新一条往前挑选历史消息，直到条数或字符预算用尽，再恢复时间正序
 * 空内容消息（中断/失败留下的占位）不进入上下文
 */
export function selectHistory<T extends { content: string }>(history: T[]): T[] {
  const picked: T[] = []
  let chars = 0
  for (let i = history.length - 1; i >= 0 && picked.length < HISTORY_MAX_MESSAGES; i--) {
    const msg = history[i]
    if (!msg.content) continue
    if (chars + msg.content.length > HISTORY_MAX_CHARS) break
    chars += msg.content.length
    picked.push(msg)
  }
  return picked.reverse()
}

export function buildSystemPrompt(context: PromptContext = {}): string {
  let prompt = `你是 Rui Chat AI 助手，基于小米 MiMo 大模型。你能够帮助用户解答问题、进行对话交流。

当前日期：${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}

## 能力说明
- 支持中英文对话
- 支持代码编写和解释
- 支持图片理解（用户可以发送图片）
- 支持音频理解（用户可以发送音频）`

  if (context.tools && context.tools.length > 0) {
    const toolLines = context.tools.map(tool => {
      if (tool.name === 'web_search') {
        return '- 支持网络搜索（当需要实时信息时，你可以调用 web_search 工具）'
      }
      const description = tool.description.length > 120 ? tool.description.slice(0, 120) : tool.description
      return `- 可调用工具 ${tool.name}：${description}`
    })
    prompt += `
${toolLines.join('\n')}`
  }

  prompt += `

## 回复格式
- 使用 Markdown 格式回复
- 代码块使用 \`\`\`语言名\`\`\` 格式
- 保持回复简洁、准确、有帮助`

  if (context.attachments && context.attachments.length > 0) {
    const textAttachments = context.attachments.filter(a => a.type !== 'image' && a.content)
    if (textAttachments.length > 0) {
      prompt += `

## 用户上传的文件
${textAttachments.map(a => `### ${a.name}\n${a.content}`).join('\n\n')}`
    }
  }

  return prompt
}

export function buildContextMessages(
  history: Array<{ role: string; content: string; thinking?: string | null }>,
  currentUserMessage: any,
  attachments?: Array<{ name: string; content?: string; data?: string; type?: string; mimeType?: string }>,
  options?: { hasWebSearch?: boolean; tools?: { name: string; description: string }[] },
): any[] {
  const messages: any[] = []

  // Add system prompt (text attachments only)
  messages.push({
    role: 'system',
    content: buildSystemPrompt({
      hasWebSearch: options?.hasWebSearch ?? false,
      tools: options?.tools,
      attachments,
    }),
  })

  // Add conversation history (bounded by message count and character budget)
  for (const msg of selectHistory(history)) {
    messages.push({
      role: msg.role,
      content: msg.content,
    })
  }

  // Build current user message with multimodal content if images exist
  const imageAttachments = attachments?.filter(a => a.type === 'image' && a.data) || []
  if (imageAttachments.length > 0) {
    const content: any[] = [
      { type: 'text', text: currentUserMessage.content },
    ]
    for (const img of imageAttachments) {
      content.push({
        type: 'image_url',
        image_url: { url: img.data },
      })
    }
    messages.push({ role: 'user', content })
  } else {
    messages.push(currentUserMessage)
  }

  return messages
}
