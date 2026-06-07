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
    // Check if account already linked
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

    // Find or create user by email
    let user = profile.email
      ? await this.prisma.user.findUnique({ where: { email: profile.email } })
      : null

    if (!user) {
      const baseUsername = profile.email?.split('@')[0] || profile.name || 'user'
      let username = baseUsername
      let counter = 1
      while (await this.prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${counter++}`
      }

      user = await this.prisma.user.create({
        data: {
          username,
          password: '', // OAuth users don't have passwords
          email: profile.email,
          name: profile.name,
          image: profile.image,
          emailVerified: new Date(),
        },
      })
    }

    // Link account
    await this.prisma.account.create({
      data: {
        userId: user.id,
        type: 'oauth',
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
    })

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      image: user.image,
    }
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, name: true, image: true, createdAt: true },
    })
  }

  private generateToken(userId: string): string {
    return this.jwtService.sign({ sub: userId })
  }
}
