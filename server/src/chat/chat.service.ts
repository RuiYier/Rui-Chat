import { Injectable } from '@nestjs/common'
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

    // Get or create conversation
    let conversationId = existingConvId
    if (!conversationId) {
      const conv = await this.prisma.conversation.create({
        data: { userId, title: '新对话' },
      })
      conversationId = conv.id
    }

    // Verify ownership
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    })
    if (!conv) {
      res.status(404).json({ message: '会话不存在' })
      return
    }

    // Save user message
    const userMessage = await this.prisma.message.create({
      data: {
        conversationId,
        role: 'user',
        content,
        attachments: attachments || undefined,
      },
    })

    // Create assistant message placeholder
    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: '',
      },
    })

    // Get message history for context
    const history = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 50,
      select: { role: true, content: true, thinking: true },
    })

    // Build context messages
    const userMsgContent: any = content
    const contextMessages = buildContextMessages(history.slice(0, -2), {
      role: 'user',
      content: userMsgContent,
    }, attachments)

    // Set up SSE
    const sseWriter = new SSEWriter(res)
    const persister = new MessagePersister(this.prisma)

    // Determine available tools
    const tools: string[] = []
    if (webSearch && this.configService.get('TAVILY_API_KEY')) {
      tools.push('web_search')
    }

    // Handle stream
    try {
      await handleStream(this.aiService, persister, this.toolRegistry, sseWriter, assistantMessage.id, {
        model,
        messages: contextMessages,
        tools,
        enableThinking: thinking,
      })
    } catch (err: any) {
      sseWriter.error(err.message || '处理请求时出错')
    }
  }
}
