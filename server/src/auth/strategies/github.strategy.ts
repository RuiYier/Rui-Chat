import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-github2'
import { ConfigService } from '@nestjs/config'
import { AuthService } from '../auth.service'

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID') || 'placeholder',
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET') || 'placeholder',
      callbackURL: '/api/auth/github/callback',
      scope: ['user:email'],
    })
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ) {
    try {
      const user = await this.authService.validateOAuthUser({
        provider: 'github',
        providerAccountId: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName || profile.username,
        image: profile.photos?.[0]?.value,
      })
      done(null, user)
    } catch (err) {
      done(err, false)
    }
  }
}
