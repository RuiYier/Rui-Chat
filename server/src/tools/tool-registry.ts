import { Injectable } from '@nestjs/common'

/**
 * 工具接口定义
 * 所有工具必须实现此接口
 */
export interface Tool {
  /** 工具名称 */
  name: string
  /** 工具描述 */
  description: string
  /** 工具参数定义（JSON Schema 格式） */
  parameters: any
  /** 工具执行函数 */
  execute: (args: any) => Promise<{ content: string }>
}

/**
 * 工具注册表
 * 管理所有可用工具的注册与查询
 */
@Injectable()
export class ToolRegistry {
  private tools = new Map<string, Tool>()

  /**
   * 注册工具
   * @param tool 要注册的工具实例
   */
  register(tool: Tool) {
    this.tools.set(tool.name, tool)
  }

  /**
   * 获取指定名称的工具
   * @param name 工具名称
   * @returns 工具实例，不存在则返回 undefined
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  /**
   * 获取所有已注册的工具
   * @returns 工具数组
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values())
  }

  /**
   * 获取工具定义列表（用于 AI API 调用）
   * @returns 符合 OpenAI Function Calling 格式的工具定义数组
   */
  getToolDefinitions() {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }))
  }
}
