import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AuthService } from '@/services/auth.service'
import type { User, UserFeatures } from '@/types/user'

const defaultFeatures: UserFeatures = { voiceInput: true, webSearch: true, tts: true }

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchUser() {
    if (!AuthService.isAuthenticated()) return

    loading.value = true
    try {
      user.value = await AuthService.getMe()
    } catch {
      user.value = null
      localStorage.removeItem('token')
    } finally {
      loading.value = false
    }
  }

  async function login(username: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const data = await AuthService.login(username, password)
      user.value = data.user
      return data
    } catch (err: any) {
      error.value = err.response?.data?.message || '登录失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function register(username: string, password: string, email?: string, name?: string) {
    loading.value = true
    error.value = null
    try {
      const data = await AuthService.register(username, password, email, name)
      user.value = data.user
      return data
    } catch (err: any) {
      error.value = err.response?.data?.message || '注册失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  function logout() {
    AuthService.logout()
    user.value = null
  }

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const features = computed<UserFeatures>(() => ({
    ...defaultFeatures,
    ...(user.value?.features || {}),
  }))

  return { user, loading, error, fetchUser, login, register, logout, isAuthenticated, isAdmin, features }
})
