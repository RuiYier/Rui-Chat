import { ToolRegistry } from './tool-registry'

export class ToolHandler {
  constructor(private registry: ToolRegistry) {}

  async executeToolCall(id: string, name: string, argumentsJson: string) {
    const tool = this.registry.get(name)
    if (!tool) {
      return { id, name, content: `Unknown tool: ${name}` }
    }

    try {
      const args = JSON.parse(argumentsJson)
      const result = await tool.execute(args)
      return { id, name, content: result.content }
    } catch (err: any) {
      return { id, name, content: `Tool execution error: ${err.message}` }
    }
  }
}
