import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SystemSettings } from '@prisma/client'

export type UpdateSystemSettingsData = Partial<
  Pick<
    SystemSettings,
    'enableVoiceInput' | 'enableWebSearch' | 'enableTts' | 'allowRegistration'
  >
>

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取系统设置单例，不存在时自动创建
   */
  async getSettings(): Promise<SystemSettings> {
    return this.prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton' },
      update: {},
    })
  }

  /**
   * 更新系统设置单例（部分更新）
   */
  async updateSettings(data: UpdateSystemSettingsData): Promise<SystemSettings> {
    return this.prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', ...data },
      update: data,
    })
  }
}
