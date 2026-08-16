import api from './api'
import type { AdminSettings, AdminStats, AdminUser, McpServer, McpTestResult, Provider, ProviderModel } from '@/types/admin'

export interface McpServerBody {
  name?: string
  transport: 'stdio' | 'http'
  command?: string
  args?: string[]
  url?: string
  headers?: Record<string, string>
  isEnabled?: boolean
}

export const AdminService = {
  async getStats(): Promise<AdminStats> {
    const { data } = await api.get('/admin/stats')
    return data
  },

  async getUsers(): Promise<AdminUser[]> {
    const { data } = await api.get('/admin/users')
    return data
  },

  async createUser(body: { username: string; password: string; email?: string; name?: string; role?: string }): Promise<AdminUser> {
    const { data } = await api.post('/admin/users', body)
    return data
  },

  async updateUser(id: string, body: { role?: string; name?: string; email?: string; password?: string }): Promise<AdminUser> {
    const { data } = await api.patch(`/admin/users/${id}`, body)
    return data
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/admin/users/${id}`)
  },

  async getProviders(): Promise<Provider[]> {
    const { data } = await api.get('/admin/providers')
    return data
  },

  async createProvider(body: { name: string; baseUrl: string; apiKey: string; isEnabled?: boolean; isDefault?: boolean }): Promise<Provider> {
    const { data } = await api.post('/admin/providers', body)
    return data
  },

  async updateProvider(id: string, body: { name?: string; baseUrl?: string; apiKey?: string; isEnabled?: boolean; isDefault?: boolean }): Promise<Provider> {
    const { data } = await api.patch(`/admin/providers/${id}`, body)
    return data
  },

  async deleteProvider(id: string): Promise<void> {
    await api.delete(`/admin/providers/${id}`)
  },

  async createModel(body: { providerId: string; modelId: string; displayName: string; type?: string; isEnabled?: boolean; isDefault?: boolean }): Promise<ProviderModel> {
    const { data } = await api.post('/admin/models', body)
    return data
  },

  async updateModel(id: string, body: { modelId?: string; displayName?: string; type?: string; isEnabled?: boolean; isDefault?: boolean; providerId?: string }): Promise<ProviderModel> {
    const { data } = await api.patch(`/admin/models/${id}`, body)
    return data
  },

  async deleteModel(id: string): Promise<void> {
    await api.delete(`/admin/models/${id}`)
  },

  async getSettings(): Promise<AdminSettings> {
    const { data } = await api.get('/admin/settings')
    return data
  },

  async updateSettings(body: Partial<AdminSettings>): Promise<AdminSettings> {
    const { data } = await api.patch('/admin/settings', body)
    return data
  },

  async getMcpServers(): Promise<McpServer[]> {
    const { data } = await api.get('/admin/mcp')
    return data
  },

  async createMcpServer(body: McpServerBody): Promise<McpServer> {
    const { data } = await api.post('/admin/mcp', body)
    return data
  },

  async updateMcpServer(id: string, body: McpServerBody): Promise<McpServer> {
    const { data } = await api.patch(`/admin/mcp/${id}`, body)
    return data
  },

  async deleteMcpServer(id: string): Promise<void> {
    await api.delete(`/admin/mcp/${id}`)
  },

  async testMcpServer(body: Omit<McpServerBody, 'name' | 'isEnabled'>): Promise<McpTestResult> {
    const { data } = await api.post('/admin/mcp/test', body)
    return data
  },
}
