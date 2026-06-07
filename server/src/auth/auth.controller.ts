import { Controller, Post, Body, Get, UseGuards, Req, Res, Query } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { ConfigService } from '@nestjs/config'

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.username, dto.password, dto.email, dto.name)
  }

  @Post('login')
  @UseGuards(AuthGuard('local'))
  async login(@Req() req: any) {
    return this.authService.login(req.user)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId)
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // Redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: any, @Res() res: any) {
    const token = this.authService['generateToken'](req.user.id)
    const clientUrl = this.configService.get('VITE_API_BASE_URL', 'http://localhost:5173')
    res.redirect(`${clientUrl}/auth/callback?token=${token}`)
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubLogin() {
    // Redirects to GitHub
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  githubCallback(@Req() req: any, @Res() res: any) {
    const token = this.authService['generateToken'](req.user.id)
    const clientUrl = this.configService.get('VITE_API_BASE_URL', 'http://localhost:5173')
    res.redirect(`${clientUrl}/auth/callback?token=${token}`)
  }
}
