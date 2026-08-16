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
