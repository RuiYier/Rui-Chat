export interface PromptContext {
  hasWebSearch?: boolean
  hasImageUnderstanding?: boolean
  hasAudioUnderstanding?: boolean
  attachments?: Array<{ name: string; content: string }>
}

export function buildSystemPrompt(context: PromptContext = {}): string {
  let prompt = `你是 Rui Chat AI 助手，基于小米 MiMo 大模型。你能够帮助用户解答问题、进行对话交流。

当前日期：${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}

## 能力说明
- 支持中英文对话
- 支持代码编写和解释
- 支持图片理解（用户可以发送图片）
- 支持音频理解（用户可以发送音频）`

  if (context.hasWebSearch) {
    prompt += `
- 支持网络搜索（当需要实时信息时，你可以调用 web_search 工具）`
  }

  prompt += `

## 回复格式
- 使用 Markdown 格式回复
- 代码块使用 \`\`\`语言名\`\`\` 格式
- 保持回复简洁、准确、有帮助`

  if (context.attachments && context.attachments.length > 0) {
    prompt += `

## 用户上传的文件
${context.attachments.map(a => `### ${a.name}\n${a.content}`).join('\n\n')}`
  }

  return prompt
}

export function buildContextMessages(
  history: Array<{ role: string; content: string; thinking?: string | null }>,
  currentUserMessage: any,
  attachments?: Array<{ name: string; content: string }>,
): any[] {
  const messages: any[] = []

  // Add system prompt
  messages.push({
    role: 'system',
    content: buildSystemPrompt({ hasWebSearch: true, attachments }),
  })

  // Add conversation history (last 20 messages for context window)
  const recentHistory = history.slice(-20)
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    })
  }

  // Add current user message
  messages.push(currentUserMessage)

  return messages
}
