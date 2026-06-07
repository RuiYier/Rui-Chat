<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
  switchToLogin: []
}>()

const authStore = useAuthStore()
const form = reactive({ username: '', password: '', confirmPassword: '', email: '' })
const loading = ref(false)

async function handleRegister() {
  if (!form.username || !form.password) {
    ElMessage.warning('请填写用户名和密码')
    return
  }
  if (form.password !== form.confirmPassword) {
    ElMessage.warning('两次密码不一致')
    return
  }
  if (form.password.length < 6) {
    ElMessage.warning('密码至少 6 位')
    return
  }
  loading.value = true
  try {
    await authStore.register(form.username, form.password, form.email || undefined)
    ElMessage.success('注册成功')
    emit('success')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '注册失败')
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
  >
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold">Rui Chat</h2>
      <p class="text-sm mt-2" :style="{ color: 'var(--text-secondary)' }">创建账号开始对话</p>
    </div>

    <el-form @submit.prevent="handleRegister" label-position="top">
      <el-form-item label="用户名">
        <el-input v-model="form.username" placeholder="用户名" size="large" />
      </el-form-item>
      <el-form-item label="密码">
        <el-input v-model="form.password" type="password" placeholder="至少 6 位" show-password size="large" />
      </el-form-item>
      <el-form-item label="确认密码">
        <el-input v-model="form.confirmPassword" type="password" placeholder="再次输入密码" show-password size="large" />
      </el-form-item>
      <el-form-item label="邮箱 (可选)">
        <el-input v-model="form.email" placeholder="邮箱" size="large" />
      </el-form-item>
    </el-form>

    <button
      class="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors mt-2"
      style="background: var(--button-primary-bg)"
      @click="handleRegister"
    >
      {{ loading ? '注册中...' : '注册' }}
    </button>

    <div class="text-center mt-4">
      <span class="text-sm" :style="{ color: 'var(--text-tertiary)' }">已有账号？</span>
      <button class="text-sm font-medium" style="color: var(--ring)" @click="emit('switchToLogin')">去登录</button>
    </div>
  </el-dialog>
</template>
