import { PrismaService } from '../prisma/prisma.service'

export class MessagePersister {
  constructor(private prisma: PrismaService) {}

  async createUserMessage(conversationId: string, content: string, attachments?: any) {
    return this.prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content,
        attachments: attachments || undefined,
      },
    })
  }

  async createAssistantMessage(conversationId: string) {
    return this.prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: '',
      },
    })
  }

  async updateMessageContent(messageId: string, content: string) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { content },
    })
  }

  async updateMessageThinking(messageId: string, thinking: string) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { thinking },
    })
  }

  async updateToolCalls(messageId: string, toolCalls: any) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { toolCalls },
    })
  }

  async updateToolResults(messageId: string, toolResults: any) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { toolResults },
    })
  }

  async updateConversationTitle(conversationId: string, title: string) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
    })
  }

  async getMessageHistory(conversationId: string, limit: number = 50) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { role: true, content: true, thinking: true },
    })
  }
}
