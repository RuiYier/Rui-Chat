import { Controller, Get, UseGuards } from '@nestjs/common'
import { McpService } from './mcp.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

@Controller('mcp')
@UseGuards(JwtAuthGuard)
export class McpController {
  constructor(private mcpService: McpService) {}

  /**
   * 用户端可用的 MCP 服务器列表（仅启用且已连接的服务器，工具为原始名）
   */
  @Get('servers')
  listServers() {
    return { servers: this.mcpService.listUserServers() }
  }
}
