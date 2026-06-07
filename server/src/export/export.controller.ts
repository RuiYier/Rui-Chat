import { Controller, Get, Param, UseGuards, Res } from '@nestjs/common'
import { ExportService } from './export.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Response } from 'express'

@Controller('export')
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get(':conversationId')
  @UseGuards(JwtAuthGuard)
  async exportConversation(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
    @Res() res: Response,
  ) {
    const markdown = await this.exportService.exportConversation(conversationId, userId)

    res.set({
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="conversation-${conversationId}.md"`,
    })
    res.send(markdown)
  }
}
