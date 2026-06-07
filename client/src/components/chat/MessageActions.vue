<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { VoiceService } from '@/services/voice.service'
import { useChatStore } from '@/stores/chat'
import type { Message } from '@/types/chat'

const props = defineProps<{ message: Message }>()
const chatStore = useChatStore()
const playing = ref(false)

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.message.content)
    ElMessage.success('已复制')
  } catch {}
}

async function handleReadAloud() {
  if (playing.value) return
  playing.value = true
  try {
    const blob = await VoiceService.textToSpeech(
      props.message.content,
      chatStore.selectedVoice,
    )
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.play()
    audio.onended = () => {
      URL.revokeObjectURL(url)
      playing.value = false
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      playing.value = false
      ElMessage.error('语音播放失败')
    }
  } catch {
    playing.value = false
    ElMessage.error('语音播放失败')
  }
}
</script>

<template>
  <div :style="{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }">
    <!-- Copy -->
    <button
      :style="{
        width: '28px',
        height: '28px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: 'var(--text-tertiary)',
        transition: 'background 0.15s',
      }"
      @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--input-bg)'"
      @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'"
      @click="handleCopy"
    >
      <el-icon :size="14"><CopyDocument /></el-icon>
    </button>

    <!-- TTS - direct play with selected voice -->
    <button
      :style="{
        width: '28px',
        height: '28px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        background: 'transparent',
        cursor: playing ? 'not-allowed' : 'pointer',
        color: playing ? 'var(--ring)' : 'var(--text-tertiary)',
        transition: 'background 0.15s',
      }"
      @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--input-bg)'"
      @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'"
      @click="handleReadAloud"
    >
      <el-icon :size="14" :class="{ 'is-loading': playing }"><Headset /></el-icon>
    </button>
  </div>
</template>
