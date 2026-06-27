import { ToolRegistry } from './tool-registry'

/**
 * 工具执行器
 * 负责解析并执行工具调用
 */
export class ToolHandler {
  constructor(private registry: ToolRegistry) {}

  /**
   * 执行工具调用
   * @param id 工具调用 ID
   * @param name 工具名称
   * @param argumentsJson 工具参数（JSON 字符串）
   * @returns 执行结果，包含 id、name 和 content
   */
  async executeToolCall(id: string, name: string, argumentsJson: string) {
    const tool = this.registry.get(name)
    if (!tool) {
      return { id, name, content: `未知工具: ${name}` }
    }

    try {
      const args = JSON.parse(argumentsJson)
      const result = await tool.execute(args)
      return { id, name, content: result.content }
    } catch (err: any) {
      return { id, name, content: `工具执行错误: ${err.message}` }
    }
  }
}
