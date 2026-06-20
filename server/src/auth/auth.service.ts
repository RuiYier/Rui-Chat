import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcryptjs'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(username: string, password: string, email?: string, name?: string) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username }, ...(email ? [{ email }] : [])] },
    })
    if (existing) {
      throw new ConflictException('用户名或邮箱已存在')
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await this.prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email: email || null,
        name: name || username,
      },
      select: { id: true, username: true, email: true, name: true, image: true },
    })

    return {
      user,
      access_token: this.generateToken(user.id),
    }
  }

  async validateUser(username: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username }, { email: username }] },
    })
    if (!user || !user.password) {
      return null
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return null
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      image: user.image,
    }
  }

  async login(user: any) {
    return {
      user,
      access_token: this.generateToken(user.id),
    }
  }

  async validateOAuthUser(profile: {
    provider: string
    providerAccountId: string
    email?: string
    name?: string
    image?: string
  }) {
    // 检查是否已关联账号
    const existingAccount = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
        },
      },
      include: { user: true },
    })

    if (existingAccount) {
      return {
        id: existingAccount.user.id,
        username: existingAccount.user.username,
        email: existingAccount.user.email,
        name: existingAccount.user.name,
        image: existingAccount.user.image,
      }
    }

    // 使用事务保护用户创建和账号关联，防止并发竞态
    const result = await this.prisma.$transaction(async (tx) => {
      // 按邮箱查找已有用户
      let user = profile.email
        ? await tx.user.findUnique({ where: { email: profile.email } })
        : null

      if (!user) {
        // 生成唯一用户名，捕获唯一约束冲突后重试
        const baseUsername = profile.email?.split('@')[0] || profile.name || 'user'
        let username = baseUsername
        let counter = 1
        let created = false
        while (!created) {
          try {
            user = await tx.user.create({
              data: {
                username,
                password: '',
                email: profile.email,
                name: profile.name,
                image: profile.image,
                emailVerified: new Date(),
              },
            })
            created = true
          } catch (err: any) {
            if (err.code === 'P2002') {
              username = `${baseUsername}${counter++}`
            } else {
              throw err
            }
          }
        }
      }

      // user 此时一定不为 null（要么从数据库找到，要么刚创建）
      const userId = user!.id

      // 关联 OAuth 账号
      await tx.account.create({
        data: {
          userId,
          type: 'oauth',
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
        },
      })

      return {
        id: userId,
        username: user!.username,
        email: user!.email,
        name: user!.name,
        image: user!.image,
      }
    })

    return result
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, name: true, image: true, createdAt: true },
    })
  }

  /**
   * 为指定用户生成 JWT Token
   * @param userId 用户 ID
   * @returns JWT Token 字符串
   */
  generateTokenForUser(userId: string): string {
    return this.jwtService.sign({ sub: userId })
  }

  private generateToken(userId: string): string {
    return this.jwtService.sign({ sub: userId })
  }
}
