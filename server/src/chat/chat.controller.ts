import { Controller, Post, Body, UseGuards, Res } from '@nestjs/common'
import { ChatService } from './chat.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Response } from 'express'

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async chat(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      conversationId?: string
      content: string
      model?: string
      thinking?: boolean
      webSearch?: boolean
      attachments?: any[]
    },
    @Res() res: Response,
  ) {
    await this.chatService.handleChatRequest(userId, body, res)
  }
}
