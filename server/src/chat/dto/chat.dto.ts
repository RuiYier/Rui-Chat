import { IsString, IsOptional, IsBoolean, IsArray, MinLength, MaxLength } from 'class-validator'

export class ChatDto {
  @IsOptional()
  @IsString()
  conversationId?: string

  @IsString()
  @MinLength(1, { message: '消息内容不能为空' })
  @MaxLength(32000, { message: '消息内容不能超过 32000 个字符' })
  content: string

  @IsOptional()
  @IsString()
  model?: string

  @IsOptional()
  @IsBoolean()
  thinking?: boolean

  @IsOptional()
  @IsBoolean()
  webSearch?: boolean

  @IsOptional()
  @IsArray()
  attachments?: any[]
}