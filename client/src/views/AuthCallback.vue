<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

onMounted(async () => {
  // Server redirects with the token in the URL fragment (#token=...), fall back to query
  const hash = route.hash.startsWith('#') ? route.hash.slice(1) : ''
  const token = new URLSearchParams(hash).get('token') || (route.query.token as string)
  if (token) {
    localStorage.setItem('token', token)
    await authStore.fetchUser()
    router.replace('/chat')
  } else {
    router.replace('/')
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center" style="background: var(--background)">
    <div class="flex items-center gap-3">
      <el-icon class="is-loading" :size="24"><Loading /></el-icon>
      <span :style="{ color: 'var(--text-secondary)' }">正在登录...</span>
    </div>
  </div>
</template>
