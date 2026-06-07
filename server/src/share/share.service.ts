import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ShareService {
  constructor(private prisma: PrismaService) {}

  async getByToken(token: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { shareToken: token, isShared: true },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        user: { select: { name: true, image: true } },
      },
    })

    if (!conv) {
      throw new NotFoundException('分享链接无效或已过期')
    }

    // Increment view count
    await this.prisma.conversation.update({
      where: { id: conv.id },
      data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
    })

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
      viewCount: conv.viewCount + 1,
      sharedAt: conv.sharedAt,
    }
  }
}
