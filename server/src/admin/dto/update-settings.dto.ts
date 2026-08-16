import { IsBoolean, IsOptional } from 'class-validator'

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  enableVoiceInput?: boolean

  @IsOptional()
  @IsBoolean()
  enableWebSearch?: boolean

  @IsOptional()
  @IsBoolean()
  enableTts?: boolean

  @IsOptional()
  @IsBoolean()
  allowRegistration?: boolean
}
