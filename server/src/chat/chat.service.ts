import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'
import { McpService } from '../mcp/mcp.service'
import { AiService } from './ai.service'
import { ProviderConfigService } from './provider-config.service'
import { SSEWriter } from './sse-writer'
import { MessagePersister } from './message-persister'
import { buildContextMessages, HISTORY_MAX_MESSAGES } from './prompt.builder'
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
    private settingsService: SettingsService,
    private providerConfigService: ProviderConfigService,
    private mcpService: McpService,
  ) {}

  async handleChatRequest(
    userId: string,
    body: {
      conversationId?: string
      content: string
      model?: string
      thinking?: boolean
      webSearch?: boolean
      mcpServers?: string[]
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
      mcpServers,
      attachments,
    } = body

    // 提前创建 SSE writer，确保任何阶段的异常都能通过 SSE 返回
    const sseWriter = new SSEWriter(res)

    try {
      // 管理员关闭联网搜索时强制禁用（系统提示词与工具均不暴露）
      const settings = await this.settingsService.getSettings()
      const webSearchEnabled = settings.enableWebSearch && !!webSearch

      // 解析聊天模型（数据库配置优先，回退到环境变量 MiMo），每个请求只解析一次
      const { baseUrl, apiKey, model: resolvedModel } = await this.providerConfigService.resolveChatModel(model)

      // 获取或创建会话
      const conversationId = await this.getOrCreateConversation(userId, existingConvId)

      // 验证会话所有权
      await this.verifyConversationOwnership(conversationId, userId)

      // 判断是否为会话首条消息（持久化用户消息后总数 <= 1，即此前无任何消息）
      const isFirstMessage = (await this.prisma.message.count({ where: { conversationId } })) === 0

      // 保存用户消息和创建助手消息占位
      const { userMessage, assistantMessage } = await this.saveMessages(
        conversationId,
        content,
        attachments,
      )

      // 设置持久化器
      const persister = new MessagePersister(this.prisma)

      // 阶段 A：首条消息立即以用户输入（截断 30 字）作为临时标题，避免列表长时间显示"新对话"
      if (isFirstMessage) {
        await persister.setTitleIfDefault(conversationId, content.slice(0, 30).replace(/\n/g, ' '))
      }

      // 确定可用工具（web_search + 用户选择的 MCP 服务器工具）
      const mcpToolNames = this.mcpService.getToolNamesFor(mcpServers)
      const tools = this.getAvailableTools(webSearchEnabled, mcpToolNames)

      // 获取历史记录并构建上下文（工具元信息用于系统提示词的能力说明）
      const toolInfos = this.toolRegistry
        .getToolDefinitions()
        .filter(t => tools.includes(t.function.name))
        .map(t => ({ name: t.function.name, description: t.function.description }))
      const contextMessages = await this.buildContext(conversationId, content, attachments, toolInfos)

      // 处理流式响应（客户端断开，如点击停止生成，时中止上游 AI 请求）
      const abortController = new AbortController()
      res.on('close', () => abortController.abort())
      await handleStream(this.aiService, persister, this.toolRegistry, sseWriter, assistantMessage.id, {
        model: resolvedModel,
        baseUrl,
        apiKey,
        messages: contextMessages,
        tools,
        enableThinking: thinking,
        conversationId,
        userMessageId: userMessage.id,
        shouldGenerateTitle: isFirstMessage,
        signal: abortController.signal,
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
   * 按 seq 倒序取最近 HISTORY_MAX_MESSAGES 条历史（多取 2 条：刚持久化的用户消息与助手占位），
   * 去掉这 2 条后反转回时间正序；条数与字符预算的最终裁剪统一在 prompt.builder 中完成
   */
  private async buildContext(
    conversationId: string,
    content: string,
    attachments?: any[],
    tools: { name: string; description: string }[] = [],
  ) {
    const history = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { seq: 'desc' },
      take: HISTORY_MAX_MESSAGES + 2,
      select: { role: true, content: true, thinking: true },
    })

    return buildContextMessages(history.slice(2).reverse(), {
      role: 'user',
      content,
    }, attachments, { tools })
  }

  /**
   * 获取可用工具列表（web_search + MCP 工具）
   */
  private getAvailableTools(webSearch: boolean, mcpToolNames: string[] = []): string[] {
    const tools: string[] = []
    if (webSearch && this.configService.get('TAVILY_API_KEY')) {
      tools.push('web_search')
    }
    return [...tools, ...mcpToolNames]
  }
}
