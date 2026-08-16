<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { Message, MessageState } from '@/types/chat'
import { useChatStore } from '@/stores/chat'
import MessageContent from './MessageContent.vue'
import MessageActions from './MessageActions.vue'
import ThinkingPanel from './ThinkingPanel.vue'

const props = defineProps<{
  message: Message
  state: MessageState
  isStreaming: boolean
}>()

const chatStore = useChatStore()

// 用户消息悬停态（控制编辑按钮的显隐）
const hovered = ref(false)
// 行内编辑
const editContent = ref('')
const saving = ref(false)
const editInputRef = ref<{ focus: () => void } | null>(null)

function beginEdit() {
  editContent.value = props.message.content
  chatStore.startEdit(props.message.id)
  nextTick(() => editInputRef.value?.focus())
}

async function handleSaveEdit() {
  if (saving.value || !editContent.value.trim()) return
  saving.value = true
  try {
    await chatStore.editUserMessage(props.message.id, editContent.value)
  } finally {
    saving.value = false
  }
}

// mcp__server__tool 显示为 server · tool，普通工具名原样展示
function prettyToolName(name: string): string {
  if (!name.startsWith('mcp__')) return name
  return name.slice(5).split('__').join(' · ')
}
</script>

<template>
  <!-- User message -->
  <div v-if="message.role === 'user'" :style="{ width: '100%', padding: '16px 0' }" @mouseenter="hovered = true" @mouseleave="hovered = false">
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
        <!-- 行内编辑模式 -->
        <div v-if="chatStore.editingMessageId === message.id" :style="{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }">
          <el-input
            ref="editInputRef"
            v-model="editContent"
            type="textarea"
            :autosize="{ minRows: 2 }"
            :maxlength="32000"
            :disabled="saving"
            :style="{ width: '100%' }"
            @keydown.esc="chatStore.cancelEdit()"
          />
          <div :style="{ display: 'flex', gap: '8px' }">
            <el-button size="small" :disabled="saving" @click="chatStore.cancelEdit()">取消</el-button>
            <el-button size="small" type="primary" :loading="saving" :disabled="!editContent.trim()" @click="handleSaveEdit">保存并发送</el-button>
          </div>
        </div>
        <!-- 普通模式：消息气泡 + 悬停操作 -->
        <template v-else>
          <div :style="{ borderRadius: '24px', background: 'var(--message-user-bg)', padding: '12px 20px', color: 'var(--text-primary)' }">
            <p :style="{ fontSize: '15px', lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }">{{ message.content }}</p>
          </div>
          <!-- 悬停操作行（流式期间隐藏） -->
          <div
            v-if="!chatStore.streaming"
            :style="{ display: 'flex', gap: '4px', opacity: hovered ? 1 : 0, pointerEvents: hovered ? 'auto' : 'none', transition: 'opacity 0.15s' }"
          >
            <button
              title="编辑"
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
              @click="beginEdit"
            >
              <el-icon :size="14"><Edit /></el-icon>
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>

  <!-- AI message -->
  <div v-else :style="{ width: '100%', padding: '24px 0' }">
    <div :style="{ display: 'flex', flexDirection: 'column', gap: '16px' }">
      <!-- Waiting -->
      <div v-if="isStreaming && state.phase === 'idle' && !state.answerContent && !state.thinkingContent" :style="{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-tertiary)', cursor: 'default', userSelect: 'none' }">
        <el-icon class="is-loading" :size="14"><Loading /></el-icon>
        等待响应...
      </div>

      <!-- Thinking -->
      <ThinkingPanel v-if="state.thinkingContent" :content="state.thinkingContent" :is-streaming="isStreaming && state.phase === 'thinking'" />

      <!-- Tools -->
      <div v-if="state.activeTools.size > 0" :style="{ display: 'flex', flexDirection: 'column', gap: '8px' }">
        <div v-for="[id, tool] in state.activeTools" :key="id" :style="{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', padding: '8px 12px', borderRadius: '8px', background: 'var(--input-bg)', color: 'var(--text-secondary)', cursor: 'default', userSelect: 'none' }">
          <el-icon v-if="tool.state === 'running'" class="is-loading" :size="14"><Loading /></el-icon>
          <el-icon v-else :size="14" style="color:var(--accent-green)"><Check /></el-icon>
          <span>{{ prettyToolName(tool.name) }}</span>
        </div>
      </div>

      <!-- Answer -->
      <div v-if="state.answerContent || message.content">
        <MessageContent :content="state.answerContent || message.content" />
      </div>

      <!-- Cursor -->
      <span v-if="isStreaming && state.phase === 'answering'" :style="{ display: 'inline-block', width: '8px', height: '16px', background: 'var(--text-primary)', marginLeft: '2px', animation: 'cursor-blink 1s step-end infinite' }" />

      <!-- Error -->
      <div v-if="state.phase === 'error'" :style="{ fontSize: '14px', color: 'var(--accent-red)', cursor: 'default', userSelect: 'none' }">生成失败</div>

      <!-- Actions -->
      <MessageActions v-if="!isStreaming && message.content" :message="message" />
    </div>
  </div>
</template>
