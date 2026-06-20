import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { ConversationModule } from './conversation/conversation.module'
import { MessageModule } from './message/message.module'
import { ChatModule } from './chat/chat.module'
import { VoiceModule } from './voice/voice.module'
import { UploadModule } from './upload/upload.module'
import { ShareModule } from './share/share.module'
import { ExportModule } from './export/export.module'
import { ToolsModule } from './tools/tools.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env.local',
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: 1000,
            limit: configService.get('THROTTLE_SHORT_LIMIT', 3),
          },
          {
            name: 'medium',
            ttl: 10000,
            limit: configService.get('THROTTLE_MEDIUM_LIMIT', 20),
          },
          {
            name: 'long',
            ttl: 60000,
            limit: configService.get('THROTTLE_LONG_LIMIT', 100),
          },
        ],
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    ConversationModule,
    MessageModule,
    ChatModule,
    VoiceModule,
    UploadModule,
    ShareModule,
    ExportModule,
    ToolsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
