import { Module } from '@nestjs/common'
import { ShareService } from './share.service'
import { ShareController } from './share.controller'
import { ConversationModule } from '../conversation/conversation.module'

@Module({
  imports: [ConversationModule],
  controllers: [ShareController],
  providers: [ShareService],
})
export class ShareModule {}
