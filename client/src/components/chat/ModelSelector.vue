<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useChatStore } from '@/stores/chat'
import { ChatService } from '@/services/chat.service'
import { MODELS } from '@/constants/models'

const chatStore = useChatStore()
const show = ref(false)
const serverModels = ref<{ modelId: string; displayName: string }[]>([])

/** 服务端列表优先, 请求失败或为空时回退到本地常量 */
const displayModels = computed(() => {
  if (serverModels.value.length === 0) {
    return MODELS.map(m => ({ id: m.id, name: m.name, description: m.description }))
  }
  return serverModels.value.map(m => ({ id: m.modelId, name: m.displayName, description: '' }))
})

onMounted(async () => {
  try {
    const { models } = await ChatService.getModels()
    if (models && models.length > 0) {
      serverModels.value = models
      // 当前选中模型不在服务端列表中时, 回退到第一个服务端模型
      if (!models.some(m => m.modelId === chatStore.config.model)) {
        chatStore.setModel(models[0].modelId)
      }
    }
  } catch {
    // 保留本地硬编码列表
  }
})

function select(id: string) { chatStore.setModel(id); show.value = false }
</script>

<template>
  <div style="position:relative">
    <button class="model-trigger" :style="{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px', fontSize: '14px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.15s' }" @click="show = !show">
      <span>{{ displayModels.find(m => m.id === chatStore.config.model)?.name || chatStore.config.model }}</span>
      <el-icon :size="12" :style="{ transition: 'transform 0.2s', transform: show ? 'rotate(180deg)' : 'rotate(0)' }"><ArrowDown /></el-icon>
    </button>
    <Transition name="dropdown">
      <div v-if="show" :style="{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', width: '224px', borderRadius: '12px', padding: '4px', background: 'var(--background)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 50, overflow: 'hidden', transformOrigin: 'top left' }">
        <div v-for="m in displayModels" :key="m.id" :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)', background: chatStore.config.model === m.id ? 'var(--input-bg)' : 'transparent', transition: 'background 0.15s' }" @click="select(m.id)" @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--input-hover)'" @mouseleave="($event.currentTarget as HTMLElement).style.background = chatStore.config.model === m.id ? 'var(--input-bg)' : 'transparent'">
          <div>
            <div style="font-weight:500">{{ m.name }}</div>
            <div v-if="m.description" :style="{ fontSize: '12px', color: 'var(--text-tertiary)' }">{{ m.description }}</div>
          </div>
          <el-icon v-if="chatStore.config.model === m.id" :size="14" style="color:var(--accent-green)"><Check /></el-icon>
        </div>
      </div>
    </Transition>
    <div v-if="show" style="position:fixed;inset:0;z-index:40" @click="show = false" />
  </div>
</template>

<style scoped>
.model-trigger:hover {
  background: var(--input-bg) !important;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}
</style>
