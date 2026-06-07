<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { useConversationStore } from '@/stores/conversation'
import AppLayout from '@/components/layout/AppLayout.vue'
import MessageList from '@/components/chat/MessageList.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import ModelSelector from '@/components/chat/ModelSelector.vue'
import Header from '@/components/layout/Header.vue'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const convStore = useConversationStore()

onMounted(async () => {
  await convStore.fetchConversations()
  const convId = route.params.id as string | undefined
  if (convId) {
    chatStore.setConversation(convId)
    await chatStore.loadMessages(convId)
  }
  const msg = route.query.msg as string | undefined
  if (msg) {
    handleSend(msg)
    router.replace({ query: {} })
  }
})

watch(() => route.params.id, async (newId) => {
  if (newId && typeof newId === 'string') {
    chatStore.setConversation(newId)
    await chatStore.loadMessages(newId)
  }
})

async function handleSend(content: string, attachments?: any[]) {
  if (!chatStore.currentConversationId) {
    const conv = await convStore.createConversation()
    chatStore.setConversation(conv.id)
    router.push(`/chat/${conv.id}`)
  }
  await chatStore.sendMessage(content, attachments)
  await convStore.fetchConversations()
}

async function handleSelectConversation(id: string) {
  router.push(`/chat/${id}`)
}

async function handleNewChat() {
  chatStore.newConversation()
  router.push('/chat')
}
</script>

<template>
  <AppLayout @select-conversation="handleSelectConversation" @new-chat="handleNewChat">
    <template #header>
      <Header>
        <ModelSelector />
      </Header>
    </template>
    <template #default>
      <MessageList />
      <ChatInput @send="handleSend" />
    </template>
  </AppLayout>
</template>
