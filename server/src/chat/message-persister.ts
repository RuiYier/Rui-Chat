import { PrismaService } from '../prisma/prisma.service'

/**
 * 消息持久化器
 * 负责将聊天消息、工具调用等数据持久化到数据库
 */
export class MessagePersister {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建用户消息
   * @param conversationId 会话 ID
   * @param content 消息内容
   * @param attachments 附件数据（可选）
   */
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

  /**
   * 创建助手消息占位
   * @param conversationId 会话 ID
   * @returns 创建的空助手消息
   */
  async createAssistantMessage(conversationId: string) {
    return this.prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: '',
      },
    })
  }

  /**
   * 更新消息内容
   * @param messageId 消息 ID
   * @param content 新的消息内容
   */
  async updateMessageContent(messageId: string, content: string) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { content },
    })
  }

  /**
   * 更新消息的思考过程
   * @param messageId 消息 ID
   * @param thinking 思考过程内容
   */
  async updateMessageThinking(messageId: string, thinking: string) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { thinking },
    })
  }

  /**
   * 更新工具调用记录
   * @param messageId 消息 ID
   * @param toolCalls 工具调用数据
   */
  async updateToolCalls(messageId: string, toolCalls: any) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { toolCalls },
    })
  }

  /**
   * 更新工具执行结果
   * @param messageId 消息 ID
   * @param toolResults 工具执行结果数据
   */
  async updateToolResults(messageId: string, toolResults: any) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { toolResults },
    })
  }

  /**
   * 更新会话标题
   * @param conversationId 会话 ID
   * @param title 新的会话标题
   */
  async updateConversationTitle(conversationId: string, title: string) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
    })
  }

  /**
   * 获取消息历史
   * @param conversationId 会话 ID
   * @param limit 返回消息数量限制
   * @returns 消息列表
   */
  async getMessageHistory(conversationId: string, limit: number = 50) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { role: true, content: true, thinking: true },
    })
  }
}
