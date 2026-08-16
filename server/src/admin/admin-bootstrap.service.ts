import { Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'

/**
 * 应用启动时的管理员引导：
 * 1. 确保系统设置单例存在
 * 2. 若系统中没有管理员，将最早创建的用户提升为管理员
 */
@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
  ) {}

  async onModuleInit() {
    await this.settingsService.getSettings()

    const adminCount = await this.prisma.user.count({ where: { role: 'admin' } })
    if (adminCount > 0) {
      return
    }

    const firstUser = await this.prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
      take: 1,
    })
    if (!firstUser) {
      // 没有任何用户时无需处理，注册逻辑会授予首个注册用户管理员
      return
    }

    await this.prisma.user.update({
      where: { id: firstUser.id },
      data: { role: 'admin' },
    })
    console.log(`[Admin] Promoted first user ${firstUser.username} to admin`)
  }
}
