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
import ArtifactPanel from '@/components/artifacts/ArtifactPanel.vue'

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
  // Read pending message from localStorage (from landing page)
  const pendingMsg = localStorage.getItem('pendingMessage')
  if (pendingMsg) {
    localStorage.removeItem('pendingMessage')
    handleSend(pendingMsg)
  }
})

watch(() => route.params.id, async (newId) => {
  if (newId && typeof newId === 'string') {
    if (newId !== chatStore.currentConversationId) {
      chatStore.setConversation(newId)
      await chatStore.loadMessages(newId)
    }
  } else if (chatStore.currentConversationId) {
    // 路由回到 /chat（如删除了当前会话）：清空当前会话，流式进行中会一并中断
    chatStore.newConversation()
  }
})

async function handleSend(content: string, attachments?: any[]) {
  if (!chatStore.currentConversationId) {
    // 新会话: 用用户输入片段作为初始标题, 侧边栏立即可见（服务端还有 AI 标题兜底）
    const title = content.trim().slice(0, 30).replace(/\n/g, ' ')
    const conv = await convStore.createConversation(title)
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
      <div :style="{ display: 'flex', flex: 1, minHeight: 0, width: '100%', overflow: 'hidden', position: 'relative' }">
        <div :style="{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }">
          <MessageList />
          <ChatInput @send="handleSend" />
        </div>
        <ArtifactPanel />
      </div>
    </template>
  </AppLayout>
</template>
