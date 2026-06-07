export function exportToMarkdown(conversation: {
  title: string
  messages: Array<{ role: string; content: string; createdAt: Date }>
  user?: { name?: string | null }
}): string {
  const lines: string[] = []

  lines.push(`# ${conversation.title}`)
  lines.push('')
  lines.push(`导出时间: ${new Date().toLocaleString('zh-CN')}`)
  if (conversation.user?.name) {
    lines.push(`用户: ${conversation.user.name}`)
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const msg of conversation.messages) {
    const roleLabel = msg.role === 'user' ? '👤 用户' : '🤖 AI'
    const time = new Date(msg.createdAt).toLocaleString('zh-CN')

    lines.push(`### ${roleLabel}`)
    lines.push(`*${time}*`)
    lines.push('')
    lines.push(msg.content)
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}
