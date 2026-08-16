import { Module, Global } from '@nestjs/common'
import { McpService } from './mcp.service'
import { McpController } from './mcp.controller'

@Global()
@Module({
  controllers: [McpController],
  providers: [McpService],
  exports: [McpService],
})
export class McpModule {}
