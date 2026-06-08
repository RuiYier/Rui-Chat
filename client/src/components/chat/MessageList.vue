<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'
import ChatMessage from './ChatMessage.vue'

const chatStore = useChatStore()
const authStore = useAuthStore()
const scrollRef = ref<HTMLElement>()
const userScrolledUp = ref(false)

const userName = computed(() => authStore.user?.name || authStore.user?.username || '')

function scrollToBottom(smooth = true) {
  nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTo({ top: scrollRef.value.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
    }
  })
}

function handleScroll() {
  if (!scrollRef.value) return
  const { scrollTop, scrollHeight, clientHeight } = scrollRef.value
  userScrolledUp.value = scrollHeight - scrollTop - clientHeight > 100
}

watch(() => chatStore.messages.length, () => { if (!userScrolledUp.value) scrollToBottom() })
watch(() => chatStore.messages[chatStore.messages.length - 1]?.content, () => { if (!userScrolledUp.value) scrollToBottom(false) })
</script>

<template>
  <div
    ref="scrollRef"
    :style="{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }"
    @scroll="handleScroll"
  >
    <!-- Empty -->
    <div v-if="chatStore.messages.length === 0" :style="{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', cursor: 'default', userSelect: 'none' }">
      <p :style="{ fontSize: '32px', fontWeight: 400, color: 'var(--text-primary)' }">{{ userName ? `${userName}，` : '' }}我能帮你什么？</p>
    </div>

    <!-- Messages -->
    <div v-else :style="{ maxWidth: '768px', margin: '0 auto', padding: '24px' }">
      <ChatMessage
        v-for="msg in chatStore.messages"
        :key="msg.id"
        :message="msg"
        :state="chatStore.getMessageState(msg.id)"
        :is-streaming="chatStore.streamingMessageId === msg.id"
      />
    </div>
  </div>
</template>
