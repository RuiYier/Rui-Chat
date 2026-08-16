import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator'

export class CreateProviderDto {
  @IsString()
  name: string

  @IsString()
  @Matches(/^https?:\/\//, { message: 'baseUrl 必须以 http:// 或 https:// 开头' })
  baseUrl: string

  @IsString()
  apiKey: string

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean
}
