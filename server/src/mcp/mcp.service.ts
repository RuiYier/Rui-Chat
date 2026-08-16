import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { ToolRegistry } from '../tools/tool-registry'
import { McpServer } from '@prisma/client'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

/** 单个 MCP 工具的元信息（原始、未加命名空间的） */
export interface McpToolInfo {
  name: string
  description: string
}

/** 连接池条目：一个已（或试图）连接的 MCP 服务器 */
interface McpConnection {
  serverId: string
  serverName: string
  client: Client
  status: 'connected' | 'error' | 'disabled'
  statusMessage?: string
  tools: McpToolInfo[]
}

/** MCP 工具调用超时时间 */
const MCP_TOOL_TIMEOUT_MS = 60_000

@Injectable()
export class McpService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(McpService.name)
  private readonly connections = new Map<string, McpConnection>()
  /** 进行中的同步任务（同一服务器并发同步时复用同一次执行） */
  private readonly syncing = new Map<string, Promise<void>>()

  constructor(
    private prisma: PrismaService,
    private toolRegistry: ToolRegistry,
  ) {}

  async onModuleInit() {
    // 启动时同步所有 MCP 服务器，但不阻塞应用启动
    void this.syncAll().catch((err) => {
      this.logger.error(`[MCP] 初始化同步失败: ${err.message}`)
    })
  }

  async onModuleDestroy() {
    await this.closeAll()
  }

  /**
   * 同步所有 MCP 服务器配置：
   * 数据库中启用 → 连接；禁用 → 标记 disabled 并断开旧连接
   */
  async syncAll(): Promise<void> {
    const servers = await this.prisma.mcpServer.findMany()
    for (const server of servers) {
      await this.syncServer(server)
    }
  }

  /**
   * 同步单个服务器（断开旧连接后按当前配置重连）
   * 同一服务器的并发同步会复用同一次执行，避免竞态
   */
  async syncServer(server: McpServer): Promise<void> {
    const inFlight = this.syncing.get(server.id)
    if (inFlight) return inFlight

    const promise = this.doSyncServer(server).finally(() => {
      this.syncing.delete(server.id)
    })
    this.syncing.set(server.id, promise)
    return promise
  }

  private async doSyncServer(server: McpServer): Promise<void> {
    await this.disconnect(server.id)

    if (!server.isEnabled) {
      this.connections.set(server.id, {
        serverId: server.id,
        serverName: server.name,
        client: null as any,
        status: 'disabled',
        tools: [],
      })
      return
    }

    await this.connectServer(server)
  }

  /**
   * 连接一个 MCP 服务器并把其工具注册进 ToolRegistry
   * 连接失败不抛出，仅标记 error 状态
   */
  private async connectServer(server: McpServer): Promise<McpConnection> {
    const transport = this.createTransport(server)
    const client = new Client({ name: 'rui-chat', version: '1.0.0' })

    const connection: McpConnection = {
      serverId: server.id,
      serverName: server.name,
      client,
      status: 'error',
      tools: [],
    }
    this.connections.set(server.id, connection)

    try {
      await client.connect(transport)
    } catch (err: any) {
      connection.status = 'error'
      connection.statusMessage = err.message || '连接失败'
      this.logger.warn(`[MCP] 服务器 ${server.name} 连接失败: ${connection.statusMessage}`)
      await this.safeCloseClient(client)
      return connection
    }

    try {
      const result = await client.listTools()
      connection.tools = (result.tools || []).map((t) => ({
        name: t.name,
        description: t.description || '',
      }))
      connection.status = 'connected'
      connection.statusMessage = undefined

      for (const tool of result.tools || []) {
        this.registerServerTool(connection, tool.name, tool.description || '', tool.inputSchema)
      }
      this.logger.log(`[MCP] 服务器 ${server.name} 已连接，注册 ${connection.tools.length} 个工具`)
    } catch (err: any) {
      connection.status = 'error'
      connection.statusMessage = err.message || '获取工具列表失败'
      connection.tools = []
      this.logger.warn(`[MCP] 服务器 ${server.name} 获取工具失败: ${connection.statusMessage}`)
      await this.safeCloseClient(client)
    }

    return connection
  }

  /**
   * 根据传输方式创建对应的 Transport
   */
  private createTransport(server: McpServer) {
    if (server.transport === 'stdio') {
      return new StdioClientTransport({
        command: server.command!,
        args: (server.args as string[] | null) || [],
      })
    }
    return new StreamableHTTPClientTransport(new URL(server.url!), {
      requestInit: { headers: (server.headers as Record<string, string> | null) || undefined },
    })
  }

  /**
   * 把 MCP 工具以 mcp__<serverName>__<toolName> 注册进 ToolRegistry
   * 命名冲突时跳过并告警
   */
  private registerServerTool(
    connection: McpConnection,
    toolName: string,
    description: string,
    inputSchema: any,
  ) {
    const registryName = `mcp__${connection.serverName}__${toolName}`
    const existing = this.toolRegistry.get(registryName)
    if (existing) {
      this.logger.warn(`[MCP] 工具 ${registryName} 已被占用，跳过注册`)
      return
    }

    const serverId = connection.serverId
    this.toolRegistry.register({
      name: registryName,
      description: `[MCP:${connection.serverName}] ${description}`,
      parameters: inputSchema,
      execute: async (args: any) => {
        return this.callMcpTool(serverId, toolName, args)
      },
    })
  }

  /**
   * 调用 MCP 工具（60s 超时），并把 content 数组拍平为文本
   */
  private async callMcpTool(serverId: string, toolName: string, args: any): Promise<{ content: string }> {
    const connection = this.connections.get(serverId)
    if (!connection || connection.status !== 'connected' || !connection.client) {
      throw new Error(`MCP 服务器未连接: ${serverId}`)
    }

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('MCP tool timeout')), MCP_TOOL_TIMEOUT_MS).unref()
    })

    const result: any = await Promise.race([
      connection.client.callTool({ name: toolName, arguments: args }),
      timeout,
    ])

    const text = this.flattenToolResult(result)
    if (result?.isError) {
      throw new Error(text || 'MCP 工具执行失败')
    }
    return { content: text }
  }

  /**
   * 把 MCP callTool 结果拍平为字符串：
   * 文本项拼接 .text，非文本项以占位符标注
   */
  private flattenToolResult(result: any): string {
    if (!result) return ''
    const content = result.content
    if (!Array.isArray(content)) {
      if (typeof content === 'string') return content
      return JSON.stringify(result)
    }
    return content
      .map((item: any) => {
        if (item && typeof item.text === 'string') return item.text
        return `[不支持的内容类型: ${item?.type || 'unknown'}]`
      })
      .join('\n')
  }

  /**
   * 断开服务器连接并从注册表移除其工具
   */
  async disconnect(serverId: string): Promise<void> {
    const connection = this.connections.get(serverId)
    if (connection) {
      await this.safeCloseClient(connection.client)
    }
    this.unregisterServerTools(serverId)
    this.connections.delete(serverId)
  }

  /**
   * 从 ToolRegistry 移除指定服务器的全部工具
   */
  unregisterServerTools(serverId: string): void {
    const connection = this.connections.get(serverId)
    if (!connection) return
    for (const tool of connection.tools) {
      this.toolRegistry.unregister(`mcp__${connection.serverName}__${tool.name}`)
    }
  }

  /**
   * 关闭全部连接（应用关闭时调用）
   */
  async closeAll(): Promise<void> {
    for (const serverId of Array.from(this.connections.keys())) {
      await this.disconnect(serverId)
    }
  }

  /**
   * 计算本次聊天可用的 MCP 工具名（命名空间后的注册名）
   * - undefined：全部启用且已连接服务器的工具
   * - 数组：取其与启用且已连接服务器（按服务器 name 匹配）的工具交集
   * - 空数组：无
   */
  getToolNamesFor(selected?: string[]): string[] {
    const names: string[] = []
    for (const connection of this.connections.values()) {
      if (connection.status !== 'connected') continue
      if (selected && !selected.includes(connection.serverName)) continue
      for (const tool of connection.tools) {
        names.push(`mcp__${connection.serverName}__${tool.name}`)
      }
    }
    return names
  }

  /**
   * 各服务器连接状态（供管理端展示）
   */
  getStatuses(): Map<string, { status: string; statusMessage?: string; tools: McpToolInfo[] }> {
    const statuses = new Map<string, { status: string; statusMessage?: string; tools: McpToolInfo[] }>()
    for (const connection of this.connections.values()) {
      statuses.set(connection.serverId, {
        status: connection.status,
        statusMessage: connection.statusMessage,
        tools: connection.tools,
      })
    }
    return statuses
  }

  /**
   * 用户端可用的 MCP 服务器列表（仅启用且已连接，工具用原始名）
   */
  listUserServers(): Array<{ name: string; toolCount: number; tools: McpToolInfo[] }> {
    const servers: Array<{ name: string; toolCount: number; tools: McpToolInfo[] }> = []
    for (const connection of this.connections.values()) {
      if (connection.status !== 'connected') continue
      servers.push({
        name: connection.serverName,
        toolCount: connection.tools.length,
        tools: connection.tools,
      })
    }
    return servers
  }

  /**
   * 测试一份配置（不进入连接池）：连接 → 列工具 → 关闭
   */
  async testConnection(config: {
    transport: string
    command?: string
    args?: string[]
    url?: string
    headers?: Record<string, string>
  }): Promise<{ ok: boolean; message: string; tools: McpToolInfo[] }> {
    const transport =
      config.transport === 'stdio'
        ? new StdioClientTransport({ command: config.command!, args: config.args || [] })
        : new StreamableHTTPClientTransport(new URL(config.url!), {
            requestInit: { headers: config.headers || undefined },
          })
    const client = new Client({ name: 'rui-chat', version: '1.0.0' })

    try {
      await client.connect(transport)
      const result = await client.listTools()
      return {
        ok: true,
        message: '连接成功',
        tools: (result.tools || []).map((t) => ({ name: t.name, description: t.description || '' })),
      }
    } catch (err: any) {
      return { ok: false, message: err.message || '连接失败', tools: [] }
    } finally {
      await this.safeCloseClient(client)
    }
  }

  private async safeCloseClient(client: Client | null): Promise<void> {
    if (!client) return
    try {
      await client.close()
    } catch {
      // 忽略关闭时的异常
    }
  }
}
