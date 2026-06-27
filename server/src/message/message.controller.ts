import { Controller, Get, Put, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { MessageService } from './message.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@Controller('messages')
export class MessageController {
  constructor(private messageService: MessageService) {}

  @Get('conversation/:conversationId')
  @UseGuards(JwtAuthGuard)
  async findByConversation(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messageService.findByConversation(conversationId, userId)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.messageService.findOne(id, userId)
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { content?: string; thinking?: string },
  ) {
    return this.messageService.update(id, userId, body)
  }

  @Delete('batch')
  @UseGuards(JwtAuthGuard)
  async deleteBatch(@CurrentUser('id') userId: string, @Body('ids') ids: string[]) {
    return this.messageService.deleteBatch(ids, userId)
  }
}
