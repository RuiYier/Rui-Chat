<script setup lang="ts">
import type { Message, MessageState } from '@/types/chat'
import MessageContent from './MessageContent.vue'
import MessageActions from './MessageActions.vue'
import ThinkingPanel from './ThinkingPanel.vue'

defineProps<{
  message: Message
  state: MessageState
  isStreaming: boolean
}>()
</script>

<template>
  <!-- User message -->
  <div v-if="message.role === 'user'" :style="{ width: '100%', padding: '16px 0' }">
    <div :style="{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', gap: '8px' }">
      <div :style="{ maxWidth: '70%' }">
        <div :style="{ borderRadius: '24px', background: 'var(--message-user-bg)', padding: '12px 20px', color: 'var(--text-primary)' }">
          <p :style="{ fontSize: '15px', lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }">{{ message.content }}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- AI message -->
  <div v-else :style="{ width: '100%', padding: '24px 0' }">
    <div :style="{ display: 'flex', flexDirection: 'column', gap: '16px' }">
      <!-- Waiting -->
      <div v-if="isStreaming && state.phase === 'idle' && !state.answerContent && !state.thinkingContent" :style="{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-tertiary)' }">
        <el-icon class="is-loading" :size="14"><Loading /></el-icon>
        等待响应...
      </div>

      <!-- Thinking -->
      <ThinkingPanel v-if="state.thinkingContent" :content="state.thinkingContent" :is-streaming="isStreaming && state.phase === 'thinking'" />

      <!-- Tools -->
      <div v-if="state.activeTools.size > 0" :style="{ display: 'flex', flexDirection: 'column', gap: '8px' }">
        <div v-for="[id, tool] in state.activeTools" :key="id" :style="{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', padding: '8px 12px', borderRadius: '8px', background: 'var(--input-bg)', color: 'var(--text-secondary)' }">
          <el-icon class="is-loading" :size="14"><Loading /></el-icon>
          <span>{{ tool.name }}</span>
        </div>
      </div>

      <!-- Answer -->
      <div v-if="state.answerContent || message.content">
        <MessageContent :content="state.answerContent || message.content" />
      </div>

      <!-- Cursor -->
      <span v-if="isStreaming && state.phase === 'answering'" :style="{ display: 'inline-block', width: '8px', height: '16px', background: 'var(--text-primary)', marginLeft: '2px', animation: 'cursor-blink 1s step-end infinite' }" />

      <!-- Error -->
      <div v-if="state.phase === 'error'" :style="{ fontSize: '14px', color: 'var(--accent-red)' }">生成失败</div>

      <!-- Actions -->
      <MessageActions v-if="!isStreaming && message.content" :message="message" />
    </div>
  </div>
</template>
