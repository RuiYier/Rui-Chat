import api from './api'
import type { User } from '@/types/user'

export const AuthService = {
  async login(username: string, password: string) {
    const { data } = await api.post('/auth/login', { username, password })
    if (data.access_token) {
      localStorage.setItem('token', data.access_token)
    }
    return data
  },

  async register(username: string, password: string, email?: string, name?: string) {
    const { data } = await api.post('/auth/register', { username, password, email, name })
    if (data.access_token) {
      localStorage.setItem('token', data.access_token)
    }
    return data
  },

  async getMe(): Promise<User> {
    const { data } = await api.get('/auth/me')
    return data
  },

  logout() {
    localStorage.removeItem('token')
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token')
  },
}
