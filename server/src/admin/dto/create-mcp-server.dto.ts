import { IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString, Matches } from 'class-validator'

export class CreateMcpServerDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{1,32}$/, { message: '名称只能包含字母、数字、下划线和连字符，长度 1-32' })
  name: string

  @IsIn(['stdio', 'http'], { message: '传输方式必须是 stdio 或 http' })
  transport: string

  @IsOptional()
  @IsString()
  command?: string

  @IsOptional()
  @IsArray()
  args?: string[]

  @IsOptional()
  @IsString()
  @Matches(/^https?:\/\//, { message: 'url 必须以 http:// 或 https:// 开头' })
  url?: string

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean
}
