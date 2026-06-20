import { IsString, MaxLength } from 'class-validator'

export class UpdateApiKeyDto {
  @IsString()
  @MaxLength(200, { message: 'API Key 不能超过 200 个字符' })
  apiKey: string
}