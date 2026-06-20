import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { AiService } from './ai.service'
import { SSEWriter } from './sse-writer'
import { MessagePersister } from './message-persister'
import { buildContextMessages } from './prompt.builder'
import { handleStream } from './stream.handler'
import { ToolRegistry } from '../tools/tool-registry'
import { Response } from 'express'

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private configService: ConfigService,
    private toolRegistry: ToolRegistry,
  ) {}

  async handleChatRequest(
    userId: string,
    body: {
      conversationId?: string
      content: string
      model?: string
      thinking?: boolean
      webSearch?: boolean
      attachments?: any[]
    },
    res: Response,
  ) {
    const {
      conversationId: existingConvId,
      content,
      model = 'mimo-v2.5-pro',
      thinking = false,
      webSearch = false,
      attachments,
    } = body

    // 提前创建 SSE writer，确保任何阶段的异常都能通过 SSE 返回
    const sseWriter = new SSEWriter(res)

    try {
      // 获取或创建会话
      const conversationId = await this.getOrCreateConversation(userId, existingConvId)

      // 验证会话所有权
      await this.verifyConversationOwnership(conversationId, userId)

      // 保存用户消息和创建助手消息占位
      const { userMessage, assistantMessage } = await this.saveMessages(
        conversationId,
        content,
        attachments,
      )

      // 获取历史记录并构建上下文
      const contextMessages = await this.buildContext(conversationId, content, attachments)

      // 设置持久化器
      const persister = new MessagePersister(this.prisma)

      // 确定可用工具
      const tools = this.getAvailableTools(webSearch)

      // 处理流式响应
      await handleStream(this.aiService, persister, this.toolRegistry, sseWriter, assistantMessage.id, {
        model,
        messages: contextMessages,
        tools,
        enableThinking: thinking,
        conversationId,
      })
    } catch (err: any) {
      sseWriter.error(err.message || '处理请求时出错')
    }
  }


  //  获取或创建会话

  private async getOrCreateConversation(userId: string, conversationId?: string): Promise<string> {
    if (conversationId) {
      return conversationId
    }
    const conv = await this.prisma.conversation.create({
      data: { userId, title: '新对话' },
    })
    return conv.id
  }

  /**
   * 验证会话所有权
   */
  private async verifyConversationOwnership(conversationId: string, userId: string): Promise<void> {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    })
    if (!conv) {
      throw new NotFoundException('会话不存在')
    }
  }

  /**
   * 保存用户消息和创建助手消息占位
   */
  private async saveMessages(conversationId: string, content: string, attachments?: any[]) {
    const userMessage = await this.prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content,
        attachments: attachments || undefined,
      },
    })

    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: '',
      },
    })

    return { userMessage, assistantMessage }
  }

  /**
   * 获取历史记录并构建上下文
   */
  private async buildContext(conversationId: string, content: string, attachments?: any[]) {
    const history = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 50,
      select: { role: true, content: true, thinking: true },
    })

    return buildContextMessages(history.slice(0, -2), {
      role: 'user',
      content,
    }, attachments)
  }

  /**
   * 获取可用工具列表
   */
  private getAvailableTools(webSearch: boolean): string[] {
    const tools: string[] = []
    if (webSearch && this.configService.get('TAVILY_API_KEY')) {
      tools.push('web_search')
    }
    return tools
  }
}
