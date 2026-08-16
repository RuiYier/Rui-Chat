import api from './api'
import type { McpTool } from '@/types/admin'

export interface McpServerInfo {
  name: string
  toolCount: number
  tools: McpTool[]
}

export const McpService = {
  /** 获取当前可用（已启用且连接成功）的 MCP 服务器 */
  async getServers(): Promise<McpServerInfo[]> {
    const { data } = await api.get('/mcp/servers')
    return data.servers
  },
}
