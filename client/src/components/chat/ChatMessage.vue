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
      <div :style="{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }">
        <!-- File attachments -->
        <div v-if="message.attachments && message.attachments.length > 0" :style="{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'flex-end' }">
          <template v-for="(att, i) in message.attachments" :key="i">
            <!-- Image attachment -->
            <div v-if="att.type === 'image' && att.data" :style="{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', maxWidth: '300px' }">
              <img :src="att.data" :alt="att.name" :style="{ display: 'block', maxWidth: '100%', height: 'auto', maxHeight: '200px', objectFit: 'contain' }" />
            </div>
            <!-- Text file attachment -->
            <div v-else :style="{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '8px', fontSize: '13px', background: att.name.endsWith('.md') ? '#FFF7ED' : '#EFF6FF', border: att.name.endsWith('.md') ? '1px solid #FDBA74' : '1px solid #93C5FD', color: att.name.endsWith('.md') ? '#C2410C' : '#1D4ED8' }">
              <el-icon :size="14"><Document /></el-icon>
              <span>{{ att.name }}</span>
            </div>
          </template>
        </div>
        <!-- Message content -->
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
      <div v-if="isStreaming && state.phase === 'idle' && !state.answerContent && !state.thinkingContent" :style="{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-tertiary)', cursor: 'default' }">
        <el-icon class="is-loading" :size="14"><Loading /></el-icon>
        等待响应...
      </div>

      <!-- Thinking -->
      <ThinkingPanel v-if="state.thinkingContent" :content="state.thinkingContent" :is-streaming="isStreaming && state.phase === 'thinking'" />

      <!-- Tools -->
      <div v-if="state.activeTools.size > 0" :style="{ display: 'flex', flexDirection: 'column', gap: '8px' }">
        <div v-for="[id, tool] in state.activeTools" :key="id" :style="{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', padding: '8px 12px', borderRadius: '8px', background: 'var(--input-bg)', color: 'var(--text-secondary)', cursor: 'default' }">
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
      <div v-if="state.phase === 'error'" :style="{ fontSize: '14px', color: 'var(--accent-red)', cursor: 'default' }">生成失败</div>

      <!-- Actions -->
      <MessageActions v-if="!isStreaming && message.content" :message="message" />
    </div>
  </div>
</template>
