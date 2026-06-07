import { Module } from '@nestjs/common'
import { VoiceService } from './voice.service'
import { VoiceController } from './voice.controller'
import { ChatModule } from '../chat/chat.module'

@Module({
  imports: [ChatModule],
  controllers: [VoiceController],
  providers: [VoiceService],
})
export class VoiceModule {}
