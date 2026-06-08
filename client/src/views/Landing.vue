<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoginDialog from '@/components/auth/LoginDialog.vue'
import LandingTutorial from '@/components/landing/LandingTutorial.vue'

const router = useRouter()
const authStore = useAuthStore()
const showLogin = ref(false)
const inputValue = ref('')

if (authStore.isAuthenticated) {
  router.replace('/chat')
}

function onLoginSuccess() {
  showLogin.value = false
  router.push('/chat')
}

function handleSend() {
  if (!authStore.isAuthenticated) {
    showLogin.value = true
    return
  }
  if (inputValue.value.trim()) {
    router.push({ path: '/chat', query: { msg: inputValue.value } })
  }
}
</script>

<template>
  <div :style="{ minHeight: '100vh', background: 'var(--background)' }">
    <div
      :style="{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '48px 24px 24px',
      }"
    >
      <div :style="{ width: '100%', maxWidth: '72rem' }">
        <!-- Hero Section -->
        <div :style="{ textAlign: 'center', marginBottom: '48px' }">
          <h1
            :style="{
              fontSize: '3.75rem',
              fontWeight: '700',
              letterSpacing: '-0.025em',
              color: 'var(--text-primary)',
              marginBottom: '24px',
              fontFamily: 'Geom, sans-serif',
              cursor: 'default',
            }"
          >
            Rui Chat
          </h1>
          <p
            :style="{
              fontSize: '1.25rem',
              maxWidth: '42rem',
              margin: '0 auto',
              lineHeight: '1.75',
              color: 'var(--text-secondary)',
              cursor: 'default',
            }"
          >
            新一代 AI 对话助手，让智能对话变得简单而优雅
          </p>
        </div>

        <!-- Feature Cards -->
        <div
          :style="{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '48px',
          }"
        >
          <div
            v-for="feature in [
              { icon: 'Promotion', title: '实时响应', desc: '毫秒级流式输出，体验丝滑的对话流程' },
              { icon: 'MagicStick', title: '思考可见', desc: '完整展现 AI 推理过程，让答案更可信' },
              { icon: 'Download', title: '历史保存', desc: '自动保存所有对话，随时查看历史记录' },
              { icon: 'Share', title: '一键分享', desc: '生成分享链接，让他人也能看到精彩对话' },
            ]"
            :key="feature.title"
            class="feature-card"
            :style="{
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              cursor: 'default',
              transition: 'box-shadow 0.2s, border-color 0.2s',
            }"
          >
            <div
              :style="{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                background: 'var(--input-bg)',
              }"
            >
              <el-icon :size="18" :style="{ color: 'var(--text-secondary)' }">
                <component :is="feature.icon" />
              </el-icon>
            </div>
            <h3
              :style="{
                fontWeight: '600',
                fontSize: '14px',
                marginBottom: '4px',
                color: 'var(--text-primary)',
              }"
            >
              {{ feature.title }}
            </h3>
            <p
              :style="{
                fontSize: '12px',
                color: 'var(--text-secondary)',
              }"
            >
              {{ feature.desc }}
            </p>
          </div>
        </div>

        <!-- Input Section -->
        <div :style="{ maxWidth: '42rem', margin: '0 auto' }">
          <div :style="{ position: 'relative' }">
            <input
              v-model="inputValue"
              type="text"
              placeholder="输入消息开始对话..."
              :style="{
                width: '100%',
                padding: '16px 56px 16px 24px',
                fontSize: '1rem',
                borderRadius: '16px',
                border: '2px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'border-color 0.2s',
              }"
              @focus="($event.target as HTMLElement).style.borderColor = 'var(--ring)'"
              @blur="($event.target as HTMLElement).style.borderColor = 'var(--border)'"
              @keydown.enter="handleSend"
            />
            <button
              :style="{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                background: 'var(--button-primary-bg)',
                color: '#fff',
                transition: 'opacity 0.2s',
              }"
              @mouseenter="($event.target as HTMLElement).style.opacity = '0.85'"
              @mouseleave="($event.target as HTMLElement).style.opacity = '1'"
              @click="handleSend"
            >
              <el-icon :size="18"><Promotion /></el-icon>
            </button>
          </div>
          <p
            :style="{
              textAlign: 'center',
              fontSize: '0.875rem',
              marginTop: '24px',
              color: 'var(--text-tertiary)',
              cursor: 'default',
            }"
          >
            点击发送后，您需要登录或注册账号
          </p>
        </div>
      </div>
    </div>

    <LoginDialog v-model="showLogin" @success="onLoginSuccess" />
    <LandingTutorial />
  </div>
</template>

<style scoped>
.feature-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: var(--ring);
}
</style>
