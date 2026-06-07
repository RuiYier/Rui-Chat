<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { VoiceService } from '@/services/voice.service'
import { useChatStore } from '@/stores/chat'
import { VOICES } from '@/constants/voices'
import type { Message } from '@/types/chat'

const props = defineProps<{ message: Message }>()
const chatStore = useChatStore()
const showVoiceMenu = ref(false)

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.message.content)
    ElMessage.success('已复制')
  } catch {}
}

async function handleReadAloud(voiceId?: string) {
  showVoiceMenu.value = false
  try {
    const blob = await VoiceService.textToSpeech(
      props.message.content,
      voiceId || chatStore.selectedVoice,
    )
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.play()
    audio.onended = () => URL.revokeObjectURL(url)
  } catch {
    ElMessage.error('语音播放失败')
  }
}
</script>

<template>
  <div class="flex items-center gap-1 mt-2">
    <!-- Copy -->
    <el-tooltip content="复制" placement="top">
      <button
        class="h-7 w-7 rounded flex items-center justify-center transition-colors"
        :style="{ color: 'var(--text-tertiary)' }"
        @click="handleCopy"
        @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--input-bg)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'"
      >
        <el-icon :size="14"><CopyDocument /></el-icon>
      </button>
    </el-tooltip>

    <!-- TTS -->
    <div class="relative">
      <el-tooltip content="朗读" placement="top">
        <button
          class="h-7 w-7 rounded flex items-center justify-center transition-colors"
          :style="{ color: 'var(--text-tertiary)' }"
          @click="showVoiceMenu = !showVoiceMenu"
          @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--input-bg)'"
          @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'"
        >
          <el-icon :size="14"><Headset /></el-icon>
        </button>
      </el-tooltip>

      <!-- Voice selector -->
      <div
        v-if="showVoiceMenu"
        class="absolute bottom-full left-0 mb-1 w-48 rounded-lg border shadow-lg z-50 overflow-hidden"
        :style="{ background: 'var(--background)', borderColor: 'var(--border)' }"
      >
        <div class="py-1 max-h-[30vh] overflow-y-auto scrollbar-hide">
          <div
            v-for="voice in VOICES"
            :key="voice.id"
            class="flex items-center justify-between px-3 py-1.5 cursor-pointer text-sm transition-colors"
            :style="{ color: 'var(--text-primary)' }"
            @click="handleReadAloud(voice.id)"
            @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)'"
            @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'"
          >
            <span>{{ voice.name }}</span>
            <span class="text-xs" :style="{ color: 'var(--text-tertiary)' }">
              {{ voice.gender === 'Female' ? '女' : '男' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showVoiceMenu" class="fixed inset-0 z-40" @click="showVoiceMenu = false" />
  </div>
</template>
