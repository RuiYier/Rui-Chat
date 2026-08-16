import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class UpdateModelDto {
  @IsOptional()
  @IsString()
  modelId?: string

  @IsOptional()
  @IsString()
  displayName?: string

  @IsOptional()
  @IsString()
  type?: string

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean

  @IsOptional()
  @IsString()
  providerId?: string
}
