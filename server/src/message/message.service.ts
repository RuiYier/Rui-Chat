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

  async findOne(id: string, userId: string) {
    const msg = await this.prisma.message.findFirst({
      where: {
        id,
        conversation: { userId },
      },
      include: { conversation: true },
    })
    if (!msg) throw new NotFoundException('消息不存在')
    return msg
  }

  async update(id: string, userId: string, data: { content?: string; thinking?: string }) {
    // 验证消息所有权
    const msg = await this.prisma.message.findFirst({
      where: {
        id,
        conversation: { userId },
      },
    })
    if (!msg) throw new NotFoundException('消息不存在')

    return this.prisma.message.update({
      where: { id },
      data,
    })
  }

  async deleteBatch(ids: string[], userId: string) {
    // 验证所有消息的所有权
    const messages = await this.prisma.message.findMany({
      where: {
        id: { in: ids },
        conversation: { userId },
      },
    })

    if (messages.length !== ids.length) {
      throw new NotFoundException('部分消息不存在或无权删除')
    }

    await this.prisma.message.deleteMany({
      where: { id: { in: ids } },
    })
    return { success: true, deleted: ids.length }
  }
}
