<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const authStore = useAuthStore()
const chatStore = useChatStore()
const route = useRoute()
const router = useRouter()

const showUserMenu = ref(false)
const showAboutDialog = ref(false)
const isExporting = ref(false)

const conversationId = computed(() => route.params.id as string | undefined)

async function handleExport() {
  if (!conversationId.value) {
    ElMessage.warning('请先选择一个会话')
    return
  }
  if (isExporting.value) return
  isExporting.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/export/${conversationId.value}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error('导出失败')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation-${conversationId.value}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  } finally {
    isExporting.value = false
  }
}

async function handleLogout() {
  showUserMenu.value = false
  authStore.logout()
  router.push('/')
}

function cycleTheme() {
  document.documentElement.classList.toggle('dark')
  localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  showUserMenu.value = false
}

function closeMenus() {
  showUserMenu.value = false
}

onMounted(() => document.addEventListener('click', closeMenus))
onUnmounted(() => document.removeEventListener('click', closeMenus))
</script>

<template>
  <header
    :style="{
      position: 'sticky',
      top: 0,
      zIndex: 10,
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      background: 'var(--background)',
      flexShrink: 0,
    }"
  >
    <div style="display:flex;align-items:center">
      <slot />
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <!-- Export button -->
      <button
        v-if="conversationId"
        :style="{ height: '36px', padding: '0 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', border: '1px solid var(--border)', background: 'transparent', cursor: isExporting ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)', opacity: isExporting ? 0.6 : 1 }"
        @click="handleExport"
      >
        <el-icon :size="14"><Download /></el-icon>
        <span>{{ isExporting ? '导出中...' : '导出' }}</span>
      </button>

      <!-- About button -->
      <button
        :style="{ width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }"
        @click="showAboutDialog = true"
      >
        <el-icon :size="16"><InfoFilled /></el-icon>
      </button>

      <!-- Theme toggle -->
      <button
        :style="{ width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }"
        @click="cycleTheme"
      >
        <el-icon :size="18"><Sunny /></el-icon>
      </button>

      <!-- User avatar -->
      <div v-if="authStore.user" style="position:relative">
        <div
          :style="{
            width: '36px', height: '36px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            background: 'transparent', color: 'var(--text-secondary)',
          }"
          @click.stop="showUserMenu = !showUserMenu"
        >
          <el-icon :size="22"><UserFilled /></el-icon>
        </div>
        <!-- User dropdown -->
        <Transition name="dropdown">
          <div v-if="showUserMenu" :style="{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', zIndex: 100, width: '220px', borderRadius: '12px', padding: '4px', background: 'var(--background)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }" @click.stop>
          <!-- User info -->
          <div :style="{ padding: '10px 12px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }">
            <div :style="{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }">{{ authStore.user.name || authStore.user.username }}</div>
            <div v-if="authStore.user.email" :style="{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }">{{ authStore.user.email }}</div>
          </div>
          <!-- Theme -->
          <div :style="{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: 'var(--text-primary)' }" @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--input-hover)'" @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'" @click="cycleTheme">
            <el-icon :size="14"><Sunny /></el-icon>
            <span>切换主题</span>
          </div>
          <!-- Logout -->
          <div :style="{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: 'var(--accent-red)' }" @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--input-hover)'" @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'" @click="handleLogout">
            <el-icon :size="14"><SwitchButton /></el-icon>
            <span>退出登录</span>
          </div>
        </Transition>
      </div>
    </div>

    <!-- About dialog -->
    <Teleport to="body">
      <template v-if="showAboutDialog">
        <Transition name="backdrop">
          <div :style="{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)' }" @click="showAboutDialog = false" />
        </Transition>
        <Transition name="dialog">
          <div :style="{ position: 'fixed', inset: 0, zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center' }">
            <div :style="{ width: '420px', borderRadius: '16px', padding: '24px', background: 'var(--background)', border: '1px solid var(--border)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }" @click.stop>
              <h2 :style="{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }">关于 Rui Chat</h2>
              <p :style="{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }">一个基于小米 MiMo 大模型的智能对话应用</p>
              <div :style="{ marginBottom: '16px' }">
                <h4 :style="{ fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-primary)' }">版本信息</h4>
                <p :style="{ fontSize: '13px', color: 'var(--text-secondary)' }">版本: 1.0.0</p>
              </div>
              <div :style="{ marginBottom: '16px' }">
                <h4 :style="{ fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-primary)' }">功能特性</h4>
                <ul :style="{ fontSize: '13px', color: 'var(--text-secondary)', listStyle: 'none', padding: 0, margin: 0 }">
                  <li :style="{ marginBottom: '4px' }">• 支持 MiMo 大模型对话</li>
                  <li :style="{ marginBottom: '4px' }">• 深度思考模式</li>
                  <li :style="{ marginBottom: '4px' }">• 语音输入与合成</li>
                  <li :style="{ marginBottom: '4px' }">• 会话分享与导出</li>
                  <li :style="{ marginBottom: '4px' }">• OAuth 登录（GitHub/Google）</li>
                </ul>
              </div>
              <div>
                <h4 :style="{ fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-primary)' }">技术栈</h4>
                <p :style="{ fontSize: '13px', color: 'var(--text-secondary)' }">Vue 3 • NestJS • TypeScript • Prisma • PostgreSQL</p>
              </div>
              <button :style="{ marginTop: '20px', width: '100%', padding: '10px', borderRadius: '12px', fontSize: '14px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)' }" @click="showAboutDialog = false">关闭</button>
            </div>
          </div>
        </Transition>
      </template>
    </Teleport>
  </header>
</template>
