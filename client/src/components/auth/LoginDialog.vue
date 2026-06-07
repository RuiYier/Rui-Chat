<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
  switchToRegister: []
}>()

const authStore = useAuthStore()
const form = reactive({ username: '', password: '' })
const loading = ref(false)

async function handleLogin() {
  if (!form.username || !form.password) {
    ElMessage.warning('请填写用户名和密码')
    return
  }
  loading.value = true
  try {
    await authStore.login(form.username, form.password)
    ElMessage.success('登录成功')
    emit('success')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    width="420px"
    :close-on-click-modal="false"
    :show-close="true"
  >
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold">Rui Chat</h2>
      <p class="text-sm mt-2" :style="{ color: 'var(--text-secondary)' }">请登录以继续使用</p>
      <p class="text-xs mt-1" :style="{ color: 'var(--text-tertiary)' }">首次登录将自动创建账号</p>
    </div>

    <!-- OAuth buttons -->
    <div class="space-y-3 mb-6">
      <button
        class="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border"
        style="background: #fff; border-color: #D1D5DB; color: #374151;"
        @click="window.location.href='/api/auth/google'"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        使用 Google 登录
      </button>
      <button
        class="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        style="background: #24292F; color: #fff;"
        @click="window.location.href='/api/auth/github'"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
        使用 GitHub 登录
      </button>
    </div>

    <!-- Divider -->
    <div class="flex items-center gap-4 mb-6">
      <div class="flex-1 h-px" :style="{ background: 'var(--border)' }"></div>
      <span class="text-xs" :style="{ color: 'var(--text-tertiary)' }">或</span>
      <div class="flex-1 h-px" :style="{ background: 'var(--border)' }"></div>
    </div>

    <!-- Form -->
    <el-form @submit.prevent="handleLogin" label-position="top">
      <el-form-item label="用户名">
        <el-input v-model="form.username" placeholder="用户名或邮箱" size="large" />
      </el-form-item>
      <el-form-item label="密码">
        <el-input v-model="form.password" type="password" placeholder="密码" show-password size="large" />
      </el-form-item>
    </el-form>

    <button
      class="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors mt-2"
      style="background: var(--button-primary-bg)"
      @click="handleLogin"
    >
      {{ loading ? '登录中...' : '登录' }}
    </button>

    <div class="text-center mt-4">
      <span class="text-sm" :style="{ color: 'var(--text-tertiary)' }">没有账号？</span>
      <button class="text-sm font-medium" style="color: var(--ring)" @click="emit('switchToRegister')">立即注册</button>
    </div>
  </el-dialog>
</template>
