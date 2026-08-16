import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { ProviderConfigService } from './provider-config.service'

@Controller('models')
export class ModelsController {
  constructor(private providerConfigService: ProviderConfigService) {}

  /**
   * 获取可用的聊天模型列表
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async listModels() {
    const models = await this.providerConfigService.listChatModels()
    return { models }
  }
}
