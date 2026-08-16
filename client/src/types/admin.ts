import type { User } from './user'

export interface AdminStats {
  users: number
  conversations: number
  messages: number
  providers: number
}

export interface AdminUser extends User {
  role: string
  createdAt: string
  _count: { conversations: number }
}

export interface ProviderModel {
  id: string
  modelId: string
  displayName: string
  type: string
  isEnabled: boolean
  isDefault: boolean
}

export interface Provider {
  id: string
  name: string
  baseUrl: string
  apiKeyMasked: string
  isEnabled: boolean
  isDefault: boolean
  createdAt: string
  models: ProviderModel[]
}

export interface AdminSettings {
  enableVoiceInput: boolean
  enableWebSearch: boolean
  enableTts: boolean
  allowRegistration: boolean
}

export interface McpTool {
  name: string
  description: string
}

export interface McpServer {
  id: string
  name: string
  transport: 'stdio' | 'http'
  command: string | null
  args: string[] | null
  url: string | null
  headersMasked: Record<string, string> | null
  isEnabled: boolean
  status: 'connected' | 'error' | 'disabled'
  statusMessage: string | null
  toolCount: number
  tools: McpTool[]
  createdAt: string
}

export interface McpTestResult {
  ok: boolean
  message: string
  tools: McpTool[]
}
