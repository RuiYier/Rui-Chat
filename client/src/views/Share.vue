<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'
import { renderMarkdown } from '@/utils/markdown'

const route = useRoute()
const loading = ref(true)
const conversation = ref<any>(null)
const error = ref('')

onMounted(async () => {
  try {
    const token = route.params.token as string
    const { data } = await api.get(`/share/${token}`)
    conversation.value = data
  } catch (err: any) {
    error.value = err.response?.data?.message || '加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex min-h-screen flex-col" style="background: var(--background)">
    <!-- Header -->
    <header class="border-b backdrop-blur" :style="{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--background) 95%, transparent)' }">
      <div class="container mx-auto max-w-4xl px-4 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold" :style="{ color: 'var(--text-primary)' }">
              {{ conversation?.title || '加载中...' }}
            </h1>
            <div class="flex flex-wrap items-center gap-4 text-sm mt-2" :style="{ color: 'var(--text-tertiary)' }">
              <span v-if="conversation?.user">{{ conversation.user.name || '匿名用户' }}</span>
              <span>{{ conversation?.viewCount || 0 }} 次查看</span>
            </div>
          </div>
          <span class="text-xs px-3 py-1 rounded-full" style="background: #DBEAFE; color: #1E40AF">
            只读模式
          </span>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1">
      <div class="container mx-auto max-w-4xl px-4 py-8">
        <div v-if="loading" class="flex justify-center py-20">
          <el-icon class="is-loading" :size="48"><Loading /></el-icon>
        </div>

        <div v-else-if="error" class="text-center py-20">
          <el-result icon="warning" :title="error" sub-title="分享链接可能已过期或无效" />
        </div>

        <div v-else-if="conversation" class="space-y-6">
          <div
            v-for="msg in conversation.messages"
            :key="msg.id"
            class="p-4 rounded-lg border"
            :style="{
              borderColor: msg.role === 'user' ? '#BFDBFE' : 'var(--border)',
              background: msg.role === 'user' ? '#EFF6FF' : 'var(--input-bg)',
            }"
          >
            <div class="text-sm font-medium mb-2" :style="{ color: 'var(--text-tertiary)' }">
              {{ msg.role === 'user' ? '👤 用户' : '🤖 AI' }}
            </div>
            <div class="prose-container" v-html="renderMarkdown(msg.content)" />
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t backdrop-blur" :style="{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--background) 95%, transparent)' }">
      <div class="container mx-auto max-w-4xl px-4 py-4 text-center text-sm" :style="{ color: 'var(--text-tertiary)' }">
        由 Rui Chat 提供支持 · 基于小米 MiMo 大模型
      </div>
    </footer>
  </div>
</template>
