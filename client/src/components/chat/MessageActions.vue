<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { VoiceService } from '@/services/voice.service'
import { PCMPlayer } from '@/utils/pcm-player'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import type { Message } from '@/types/chat'

const props = defineProps<{ message: Message }>()
const chatStore = useChatStore()
const authStore = useAuthStore()
const playing = ref(false)

let player: PCMPlayer | null = null
let abortController: AbortController | null = null

function stopPlayback() {
  abortController?.abort()
  abortController = null
  player?.stop()
  player = null
  playing.value = false
}

async function handleReadAloud() {
  // 再次点击停止播放
  if (playing.value) {
    stopPlayback()
    return
  }

  playing.value = true
  const controller = new AbortController()
  abortController = controller
  const pcmPlayer = new PCMPlayer()
  player = pcmPlayer
  pcmPlayer.onEnded = () => {
    player = null
    abortController = null
    playing.value = false
  }

  try {
    const stream = await VoiceService.textToSpeechStream(
      props.message.content,
      chatStore.selectedVoice,
      undefined,
      controller.signal,
    )
    const reader = stream.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) pcmPlayer.append(value)
    }
    pcmPlayer.end()
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      ElMessage.error(err?.message || '语音播放失败')
    }
    stopPlayback()
  }
}

onBeforeUnmount(stopPlayback)

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.message.content)
    ElMessage.success('已复制')
  } catch {}
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

    <!-- Regenerate -->
    <button
      title="重新生成"
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
      @click="chatStore.regenerateMessage(props.message.id)"
    >
      <el-icon :size="14"><RefreshRight /></el-icon>
    </button>

    <!-- TTS - direct play with selected voice -->
    <button
      v-if="authStore.features.tts"
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
