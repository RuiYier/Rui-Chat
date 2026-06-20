import { Injectable } from '@nestjs/common'
import { ConversationService } from '../conversation/conversation.service'

@Injectable()
export class ShareService {
  constructor(private conversationService: ConversationService) {}

  async getByToken(token: string) {
    const conv = await this.conversationService.getByShareToken(token)

    return {
      id: conv.id,
      title: conv.title,
      user: conv.user,
      messages: conv.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
      viewCount: conv.viewCount,
      sharedAt: conv.sharedAt,
    }
  }
}
