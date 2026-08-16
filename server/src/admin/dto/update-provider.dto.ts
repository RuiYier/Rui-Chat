import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator'

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  @Matches(/^https?:\/\//, { message: 'baseUrl 必须以 http:// 或 https:// 开头' })
  baseUrl?: string

  @IsOptional()
  @IsString()
  apiKey?: string

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean
}
