import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator'

export class UpdateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '会话标题不能超过 100 个字符' })
  title?: string

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean
}