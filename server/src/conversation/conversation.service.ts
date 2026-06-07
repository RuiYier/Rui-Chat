import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { randomBytes } from 'crypto'

@Injectable()
export class ConversationService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.conversation.findMany({
      where: { userId },
      orderBy: [{ isPinned: 'desc' }, { pinnedAt: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        isPinned: true,
        pinnedAt: true,
        isShared: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    })
  }

  async create(userId: string, title?: string) {
    return this.prisma.conversation.create({
      data: { userId, title: title || '新对话' },
      select: { id: true, title: true, createdAt: true },
    })
  }

  async update(userId: string, id: string, data: { title?: string; isPinned?: boolean }) {
    const conv = await this.prisma.conversation.findFirst({ where: { id, userId } })
    if (!conv) throw new NotFoundException('会话不存在')

    return this.prisma.conversation.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.isPinned !== undefined && {
          isPinned: data.isPinned,
          pinnedAt: data.isPinned ? new Date() : null,
        }),
      },
      select: { id: true, title: true, isPinned: true, pinnedAt: true },
    })
  }

  async delete(userId: string, id: string) {
    const conv = await this.prisma.conversation.findFirst({ where: { id, userId } })
    if (!conv) throw new NotFoundException('会话不存在')

    await this.prisma.conversation.delete({ where: { id } })
    return { success: true }
  }

  async share(userId: string, id: string) {
    const conv = await this.prisma.conversation.findFirst({ where: { id, userId } })
    if (!conv) throw new NotFoundException('会话不存在')

    const shareToken = randomBytes(16).toString('hex')
    return this.prisma.conversation.update({
      where: { id },
      data: { isShared: true, shareToken, sharedAt: new Date() },
      select: { id: true, shareToken: true, isShared: true },
    })
  }

  async unshare(userId: string, id: string) {
    const conv = await this.prisma.conversation.findFirst({ where: { id, userId } })
    if (!conv) throw new NotFoundException('会话不存在')

    return this.prisma.conversation.update({
      where: { id },
      data: { isShared: false, shareToken: null, sharedAt: null },
      select: { id: true, isShared: true },
    })
  }

  async getByShareToken(token: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { shareToken: token, isShared: true },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        user: { select: { name: true, image: true } },
      },
    })
    if (!conv) throw new NotFoundException('分享链接无效或已过期')

    // Increment view count
    await this.prisma.conversation.update({
      where: { id: conv.id },
      data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
    })

    return conv
  }
}
