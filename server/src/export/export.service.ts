import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { exportToMarkdown } from './markdown-exporter'

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async exportConversation(conversationId: string, userId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        user: { select: { name: true } },
      },
    })

    if (!conv) {
      throw new NotFoundException('会话不存在')
    }

    return exportToMarkdown({
      title: conv.title,
      messages: conv.messages,
      user: conv.user,
    })
  }
}
