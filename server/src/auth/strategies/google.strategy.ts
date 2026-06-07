import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, VerifyCallback } from 'passport-google-oauth20'
import { ConfigService } from '@nestjs/config'
import { AuthService } from '../auth.service'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || 'placeholder',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || 'placeholder',
      callbackURL: '/api/auth/google/callback',
      scope: ['email', 'profile'],
    })
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    try {
      const user = await this.authService.validateOAuthUser({
        provider: 'google',
        providerAccountId: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
        image: profile.photos?.[0]?.value,
      })
      done(null, user)
    } catch (err) {
      done(err, false)
    }
  }
}
