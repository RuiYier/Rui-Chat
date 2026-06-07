import { Module, Global } from '@nestjs/common'
import { ToolRegistry } from './tool-registry'
import { WebSearchTool } from './web-search.tool'

@Global()
@Module({
  providers: [ToolRegistry, WebSearchTool],
  exports: [ToolRegistry],
})
export class ToolsModule {}
