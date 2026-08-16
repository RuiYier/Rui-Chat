import { Injectable, BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService, UpdateSystemSettingsData } from '../settings/settings.service'
import { McpService } from '../mcp/mcp.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { CreateProviderDto } from './dto/create-provider.dto'
import { UpdateProviderDto } from './dto/update-provider.dto'
import { CreateModelDto } from './dto/create-model.dto'
import { UpdateModelDto } from './dto/update-model.dto'
import { CreateMcpServerDto } from './dto/create-mcp-server.dto'
import { UpdateMcpServerDto } from './dto/update-mcp-server.dto'
import { Model, Provider, McpServer } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private mcpService: McpService,
  ) {}

  // ========== 统计 ==========

  async getStats() {
    const [users, conversations, messages, providers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.conversation.count(),
      this.prisma.message.count(),
      this.prisma.provider.count(),
    ])
    return { users, conversations, messages, providers }
  }

  // ========== 用户管理 ==========

  async listUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        image: true,
        role: true,
        createdAt: true,
        _count: { select: { conversations: true } },
      },
    })
  }

  async createUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.username }, ...(dto.email ? [{ email: dto.email }] : [])] },
    })
    if (existing) {
      throw new ConflictException('用户名或邮箱已存在')
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10)
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        email: dto.email || null,
        name: dto.name || dto.username,
        role: dto.role || 'user',
      },
      select: this.userSelect,
    })
    return user
  }

  async updateUser(id: string, actorId: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundException('用户不存在')
    }

    // 不能修改自己的角色
    if (dto.role !== undefined && id === actorId) {
      throw new ForbiddenException('不能修改自己的角色')
    }

    // 不能降级最后一名管理员
    if (existing.role === 'admin' && dto.role === 'user') {
      const adminCount = await this.prisma.user.count({ where: { role: 'admin' } })
      if (adminCount <= 1) {
        throw new ForbiddenException('至少保留一名管理员')
      }
    }

    const data: { role?: string; name?: string; email?: string | null; password?: string } = {}
    if (dto.role !== undefined) data.role = dto.role
    if (dto.name !== undefined) data.name = dto.name
    if (dto.email !== undefined) data.email = dto.email || null
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10)

    if (Object.keys(data).length === 0) {
      return this.prisma.user.findUnique({ where: { id }, select: this.userSelect })
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: this.userSelect,
    })
  }

  async deleteUser(id: string, actorId: string) {
    // 不能删除自己
    if (id === actorId) {
      throw new ForbiddenException('不能删除自己')
    }

    const existing = await this.prisma.user.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundException('用户不存在')
    }

    // 至少保留一名管理员
    if (existing.role === 'admin') {
      const adminCount = await this.prisma.user.count({ where: { role: 'admin' } })
      if (adminCount <= 1) {
        throw new ForbiddenException('至少保留一名管理员')
      }
    }

    // 会话等关联数据由外键级联删除
    await this.prisma.user.delete({ where: { id } })
  }

  // ========== 提供商管理 ==========

  async listProviders() {
    const providers = await this.prisma.provider.findMany({
      orderBy: { createdAt: 'asc' },
      include: { models: { orderBy: { createdAt: 'asc' } } },
    })
    return providers.map((provider) => this.toProviderDto(provider))
  }

  async createProvider(dto: CreateProviderDto) {
    try {
      const provider = await this.prisma.$transaction(async (tx) => {
        // 设为默认时，取消其他提供商的默认标记
        if (dto.isDefault) {
          await tx.provider.updateMany({ data: { isDefault: false } })
        }
        return tx.provider.create({
          data: {
            name: dto.name,
            baseUrl: dto.baseUrl,
            apiKey: dto.apiKey,
            isEnabled: dto.isEnabled ?? true,
            isDefault: dto.isDefault ?? false,
          },
          include: { models: true },
        })
      })
      return this.toProviderDto(provider)
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException('提供商名称已存在')
      }
      throw err
    }
  }

  async updateProvider(id: string, dto: UpdateProviderDto) {
    const existing = await this.prisma.provider.findUnique({
      where: { id },
      include: { models: { orderBy: { createdAt: 'asc' } } },
    })
    if (!existing) {
      throw new NotFoundException('提供商不存在')
    }

    const data: { name?: string; baseUrl?: string; apiKey?: string; isEnabled?: boolean; isDefault?: boolean } = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.baseUrl !== undefined) data.baseUrl = dto.baseUrl
    // apiKey 为空或不传时保留原值
    if (dto.apiKey) data.apiKey = dto.apiKey
    if (dto.isEnabled !== undefined) data.isEnabled = dto.isEnabled
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault

    if (Object.keys(data).length === 0) {
      return this.toProviderDto(existing)
    }

    try {
      const provider = await this.prisma.$transaction(async (tx) => {
        // 设为默认时，取消其他提供商的默认标记
        if (dto.isDefault) {
          await tx.provider.updateMany({
            where: { id: { not: id } },
            data: { isDefault: false },
          })
        }
        return tx.provider.update({
          where: { id },
          data,
          include: { models: { orderBy: { createdAt: 'asc' } } },
        })
      })
      return this.toProviderDto(provider)
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException('提供商名称已存在')
      }
      throw err
    }
  }

  async deleteProvider(id: string) {
    const existing = await this.prisma.provider.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundException('提供商不存在')
    }

    // 关联模型由外键级联删除
    await this.prisma.provider.delete({ where: { id } })
  }

  // ========== 模型管理 ==========

  async createModel(dto: CreateModelDto) {
    const provider = await this.prisma.provider.findUnique({ where: { id: dto.providerId } })
    if (!provider) {
      throw new NotFoundException('提供商不存在')
    }

    const type = dto.type || 'chat'
    try {
      const model = await this.prisma.$transaction(async (tx) => {
        // 设为默认时，取消同类型的其他模型默认标记
        if (dto.isDefault) {
          await tx.model.updateMany({ where: { type }, data: { isDefault: false } })
        }
        return tx.model.create({
          data: {
            providerId: dto.providerId,
            modelId: dto.modelId,
            displayName: dto.displayName,
            type,
            isEnabled: dto.isEnabled ?? true,
            isDefault: dto.isDefault ?? false,
          },
        })
      })
      return this.toModelDto(model)
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException('该模型已存在于此前提商')
      }
      throw err
    }
  }

  async updateModel(id: string, dto: UpdateModelDto) {
    const existing = await this.prisma.model.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundException('模型不存在')
    }

    if (dto.providerId && dto.providerId !== existing.providerId) {
      const provider = await this.prisma.provider.findUnique({ where: { id: dto.providerId } })
      if (!provider) {
        throw new NotFoundException('提供商不存在')
      }
    }

    const data: {
      modelId?: string
      displayName?: string
      type?: string
      isEnabled?: boolean
      isDefault?: boolean
      providerId?: string
    } = {}
    if (dto.modelId !== undefined) data.modelId = dto.modelId
    if (dto.displayName !== undefined) data.displayName = dto.displayName
    if (dto.type !== undefined) data.type = dto.type
    if (dto.isEnabled !== undefined) data.isEnabled = dto.isEnabled
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault
    if (dto.providerId !== undefined) data.providerId = dto.providerId

    if (Object.keys(data).length === 0) {
      return this.toModelDto(existing)
    }

    try {
      const model = await this.prisma.$transaction(async (tx) => {
        // 设为默认时，取消同类型的其他模型默认标记（以更新后的类型为准）
        if (data.isDefault) {
          await tx.model.updateMany({
            where: { type: data.type ?? existing.type, id: { not: id } },
            data: { isDefault: false },
          })
        }
        return tx.model.update({ where: { id }, data })
      })
      return this.toModelDto(model)
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException('该模型已存在于此前提商')
      }
      throw err
    }
  }

  async deleteModel(id: string) {
    const existing = await this.prisma.model.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundException('模型不存在')
    }

    await this.prisma.model.delete({ where: { id } })
  }

  // ========== MCP 服务器管理 ==========

  async listMcpServers() {
    const servers = await this.prisma.mcpServer.findMany({ orderBy: { createdAt: 'asc' } })
    return servers.map((server) => this.toMcpServerDto(server))
  }

  async createMcpServer(dto: CreateMcpServerDto) {
    this.validateMcpConfig(dto)

    let server: McpServer
    try {
      server = await this.prisma.mcpServer.create({
        data: {
          name: dto.name,
          transport: dto.transport,
          command: dto.command || null,
          args: (dto.args as any) || undefined,
          url: dto.url || null,
          headers: (dto.headers as any) || undefined,
          isEnabled: dto.isEnabled ?? true,
        },
      })
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException('MCP 服务器名称已存在')
      }
      throw err
    }

    await this.syncWithTimeout(server)
    return this.toMcpServerDto(server)
  }

  async updateMcpServer(id: string, dto: UpdateMcpServerDto) {
    const existing = await this.prisma.mcpServer.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundException('MCP 服务器不存在')
    }

    // 以合并后的完整配置校验传输方式与必填字段
    this.validateMcpConfig({
      transport: dto.transport ?? existing.transport,
      command: dto.command !== undefined ? dto.command : (existing.command ?? undefined),
      url: dto.url !== undefined ? dto.url : (existing.url ?? undefined),
    })

    const data: {
      name?: string
      transport?: string
      command?: string | null
      args?: any
      url?: string | null
      headers?: any
      isEnabled?: boolean
    } = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.transport !== undefined) data.transport = dto.transport
    if (dto.command !== undefined) data.command = dto.command || null
    if (dto.args !== undefined) data.args = dto.args as any
    if (dto.url !== undefined) data.url = dto.url || null
    if (dto.headers !== undefined) data.headers = dto.headers as any
    if (dto.isEnabled !== undefined) data.isEnabled = dto.isEnabled

    let server: McpServer
    if (Object.keys(data).length === 0) {
      server = existing
    } else {
      try {
        server = await this.prisma.mcpServer.update({ where: { id }, data })
      } catch (err: any) {
        if (err.code === 'P2002') {
          throw new ConflictException('MCP 服务器名称已存在')
        }
        throw err
      }
    }

    // 断开旧连接并按新配置重连（重新注册工具）
    await this.syncWithTimeout(server)
    return this.toMcpServerDto(server)
  }

  async deleteMcpServer(id: string) {
    const existing = await this.prisma.mcpServer.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundException('MCP 服务器不存在')
    }

    // 先注销工具并关闭连接，再删除记录
    await this.mcpService.disconnect(id)
    await this.prisma.mcpServer.delete({ where: { id } })
  }

  /**
   * 校验 MCP 配置：stdio 需要 command，http 需要以 http(s) 开头的 url
   */
  private validateMcpConfig(config: { transport: string; command?: string; url?: string }) {
    if (config.transport === 'stdio') {
      if (!config.command || !config.command.trim()) {
        throw new BadRequestException('stdio 传输方式需要提供 command')
      }
    } else if (config.transport === 'http') {
      if (!config.url || !/^https?:\/\//.test(config.url)) {
        throw new BadRequestException('http 传输方式需要提供以 http:// 或 https:// 开头的 url')
      }
    }
  }

  /**
   * 触发单个服务器同步，最多等待 10 秒（超时则继续在后台连接）
   */
  private async syncWithTimeout(server: McpServer): Promise<void> {
    await Promise.race([
      this.mcpService.syncServer(server),
      new Promise<void>((resolve) => setTimeout(resolve, 10_000).unref()),
    ])
  }

  private toMcpServerDto(server: McpServer) {
    const status = this.mcpService.getStatuses().get(server.id)
    const tools = status?.tools || []
    return {
      id: server.id,
      name: server.name,
      transport: server.transport,
      command: server.command,
      args: server.args,
      url: server.url,
      headersMasked: this.maskHeaders(server.headers),
      isEnabled: server.isEnabled,
      status: status?.status ?? (server.isEnabled ? 'error' : 'disabled'),
      statusMessage: status?.statusMessage ?? (server.isEnabled && !status ? '尚未连接' : undefined),
      toolCount: tools.length,
      tools: tools.map((t) => ({ name: t.name, description: t.description })),
      createdAt: server.createdAt,
    }
  }

  /** 头部值统一脱敏为 ***，仅保留键名 */
  private maskHeaders(headers: unknown): Record<string, string> | null {
    if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return null
    const masked: Record<string, string> = {}
    for (const key of Object.keys(headers as Record<string, unknown>)) {
      masked[key] = '***'
    }
    return masked
  }

  // ========== 系统设置 ==========

  async getSettings() {
    const settings = await this.settingsService.getSettings()
    return this.toSettingsDto(settings)
  }

  async updateSettings(dto: UpdateSystemSettingsData) {
    const settings = await this.settingsService.updateSettings(dto)
    return this.toSettingsDto(settings)
  }

  // ========== 私有辅助 ==========

  private readonly userSelect = {
    id: true,
    username: true,
    email: true,
    name: true,
    image: true,
    role: true,
    createdAt: true,
  }

  /** 仅返回 API Key 最后 4 位，避免泄露 */
  private maskApiKey(apiKey: string): string {
    return `****${apiKey.slice(-4)}`
  }

  private toProviderDto(provider: Provider & { models: Model[] }) {
    return {
      id: provider.id,
      name: provider.name,
      baseUrl: provider.baseUrl,
      apiKeyMasked: this.maskApiKey(provider.apiKey),
      isEnabled: provider.isEnabled,
      isDefault: provider.isDefault,
      createdAt: provider.createdAt,
      models: provider.models.map((model) => this.toModelDto(model)),
    }
  }

  private toModelDto(model: Model) {
    return {
      id: model.id,
      modelId: model.modelId,
      displayName: model.displayName,
      type: model.type,
      isEnabled: model.isEnabled,
      isDefault: model.isDefault,
    }
  }

  private toSettingsDto(settings: {
    enableVoiceInput: boolean
    enableWebSearch: boolean
    enableTts: boolean
    allowRegistration: boolean
  }) {
    return {
      enableVoiceInput: settings.enableVoiceInput,
      enableWebSearch: settings.enableWebSearch,
      enableTts: settings.enableTts,
      allowRegistration: settings.allowRegistration,
    }
  }
}
