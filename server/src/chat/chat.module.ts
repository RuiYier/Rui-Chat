import { Module } from '@nestjs/common'
import { ChatService } from './chat.service'
import { ChatController } from './chat.controller'
import { AiService } from './ai.service'
import { ToolsModule } from '../tools/tools.module'

@Module({
  imports: [ToolsModule],
  controllers: [ChatController],
  providers: [ChatService, AiService],
  exports: [AiService],
})
export class ChatModule {}
