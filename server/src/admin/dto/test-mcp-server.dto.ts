import { IsArray, IsIn, IsObject, IsOptional, IsString, Matches } from 'class-validator'

export class TestMcpServerDto {
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
}
