import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true, name: true, image: true, apiKey: true, createdAt: true },
    })
  }

  async updateApiKey(userId: string, apiKey: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { apiKey },
      select: { id: true, apiKey: true },
    })
  }
}
