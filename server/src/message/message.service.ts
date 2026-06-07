import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  async findByConversation(conversationId: string, userId: string) {
    // Verify ownership
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    })
    if (!conv) throw new NotFoundException('会话不存在')

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findOne(id: string) {
    const msg = await this.prisma.message.findUnique({ where: { id } })
    if (!msg) throw new NotFoundException('消息不存在')
    return msg
  }

  async update(id: string, data: { content?: string; thinking?: string }) {
    return this.prisma.message.update({
      where: { id },
      data,
    })
  }

  async deleteBatch(ids: string[]) {
    await this.prisma.message.deleteMany({
      where: { id: { in: ids } },
    })
    return { success: true, deleted: ids.length }
  }
}
