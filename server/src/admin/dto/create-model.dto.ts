import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class CreateModelDto {
  @IsString()
  providerId: string

  @IsString()
  modelId: string

  @IsString()
  displayName: string

  @IsOptional()
  @IsString()
  type?: string

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean
}
