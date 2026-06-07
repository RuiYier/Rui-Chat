import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
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
})
export class AppModule {}
