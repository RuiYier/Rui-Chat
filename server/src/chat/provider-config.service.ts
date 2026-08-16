import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'

export interface ResolvedChatModel {
  baseUrl: string
  apiKey: string
  model: string
}

export interface ChatModelOption {
  modelId: string
  displayName: string
}

/**
 * 供应商配置服务
 * 负责解析聊天请求应使用的模型与供应商（数据库配置优先，回退到环境变量 MiMo）
 */
@Injectable()
export class ProviderConfigService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * 解析聊天模型
   * @param requestedModel 客户端请求的模型 ID（可选）
   * @returns 供应商接口地址、密钥与最终使用的模型 ID
   */
  async resolveChatModel(requestedModel?: string): Promise<ResolvedChatModel> {
    if (requestedModel) {
      // 指定模型：仅在启用（且供应商启用）的 chat 模型中匹配
      const matched = await this.prisma.model.findFirst({
        where: {
          modelId: requestedModel,
          type: 'chat',
          isEnabled: true,
          provider: { isEnabled: true },
        },
        include: { provider: true },
      })
      if (matched) {
        return {
          baseUrl: matched.provider.baseUrl,
          apiKey: matched.provider.apiKey,
          model: matched.modelId,
        }
      }

      // 数据库无匹配：回退到环境变量 MiMo，保留请求的模型 ID
      return this.buildEnvFallback(requestedModel)
    }

    // 未指定模型：默认模型优先，否则取最早的启用 chat 模型
    const models = await this.prisma.model.findMany({
      where: { type: 'chat', isEnabled: true, provider: { isEnabled: true } },
      include: { provider: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
    if (models.length > 0) {
      const chosen = models.find(m => m.isDefault) || models[0]
      return {
        baseUrl: chosen.provider.baseUrl,
        apiKey: chosen.provider.apiKey,
        model: chosen.modelId,
      }
    }

    return this.buildEnvFallback()
  }

  /**
   * 获取可选的聊天模型列表（用于 GET /api/models）
   * @returns 启用供应商下的启用 chat 模型；数据库为空时回退到内置列表
   */
  async listChatModels(): Promise<ChatModelOption[]> {
    const models = await this.prisma.model.findMany({
      where: { type: 'chat', isEnabled: true, provider: { isEnabled: true } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      select: { modelId: true, displayName: true },
    })
    if (models.length > 0) return models

    // 回退列表：与 client/src/constants/models.ts 保持一致
    return [
      { modelId: 'mimo-v2.5-pro', displayName: 'MiMo-V2.5-Pro' },
      { modelId: 'mimo-v2.5', displayName: 'MiMo-V2.5' },
    ]
  }

  private buildEnvFallback(model?: string): ResolvedChatModel {
    return {
      baseUrl: this.configService.get<string>('MIMO_BASE_URL', 'https://token-plan-cn.xiaomimimo.com/v1'),
      apiKey: this.configService.get<string>('MIMO_API_KEY', ''),
      model: model || 'mimo-v2.5-pro',
    }
  }
}
