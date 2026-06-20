import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator'

export class TextToSpeechDto {
  @IsString()
  @MinLength(1, { message: '文本不能为空' })
  @MaxLength(5000, { message: '文本不能超过 5000 个字符' })
  text: string

  @IsOptional()
  @IsString()
  voice?: string

  @IsOptional()
  @IsString()
  format?: string

  @IsOptional()
  @IsString()
  style?: string
}