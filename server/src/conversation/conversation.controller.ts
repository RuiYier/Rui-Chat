import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { ConversationService } from './conversation.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { UpdateConversationDto } from './dto/update-conversation.dto'

@Controller('conversations')
export class ConversationController {
  constructor(private conversationService: ConversationService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentUser('id') userId: string) {
    return this.conversationService.findAll(userId)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@CurrentUser('id') userId: string, @Body('title') title?: string) {
    return this.conversationService.create(userId, title)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: UpdateConversationDto,
  ) {
    return this.conversationService.update(userId, id, body)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.conversationService.delete(userId, id)
  }

  @Post(':id/share')
  @UseGuards(JwtAuthGuard)
  async share(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.conversationService.share(userId, id)
  }

  @Delete(':id/share')
  @UseGuards(JwtAuthGuard)
  async unshare(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.conversationService.unshare(userId, id)
  }
}
