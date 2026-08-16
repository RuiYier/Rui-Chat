import { Module } from '@nestjs/common'
import { ChatService } from './chat.service'
import { ChatController } from './chat.controller'
import { ModelsController } from './models.controller'
import { AiService } from './ai.service'
import { ProviderConfigService } from './provider-config.service'
import { ToolsModule } from '../tools/tools.module'

@Module({
  imports: [ToolsModule],
  controllers: [ChatController, ModelsController],
  providers: [ChatService, AiService, ProviderConfigService],
  exports: [AiService],
})
export class ChatModule {}
