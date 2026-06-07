<script setup lang="ts">
import { useChatStore } from '@/stores/chat'
import { VOICES } from '@/constants/voices'

const chatStore = useChatStore()

function selectVoice(voiceId: string) {
  chatStore.setVoice(voiceId)
}
</script>

<template>
  <div class="space-y-3">
    <h4 class="font-medium text-sm">语音音色</h4>

    <div class="grid grid-cols-2 gap-2">
      <div
        v-for="voice in VOICES"
        :key="voice.id"
        :class="[
          'p-2 rounded-lg cursor-pointer border text-sm transition-all',
          chatStore.selectedVoice === voice.id
            ? 'border-[var(--accent-color)] bg-blue-50 dark:bg-blue-900/20'
            : 'border-[var(--border-color)] hover:border-[var(--accent-color)]',
        ]"
        @click="selectVoice(voice.id)"
      >
        <div class="font-medium">{{ voice.name }}</div>
        <div class="text-xs text-[var(--text-tertiary)]">
          {{ voice.gender === 'Female' ? '女' : '男' }} · {{ voice.language === 'Chinese' ? '中文' : '英文' }}
        </div>
      </div>
    </div>
  </div>
</template>
