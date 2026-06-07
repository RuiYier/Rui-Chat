import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Conversation } from '@/types/chat'
import { ConversationService } from '@/services/conversation.service'

export const useConversationStore = defineStore('conversation', () => {
  const conversations = ref<Conversation[]>([])
  const loading = ref(false)
  const searchQuery = ref('')

  const filteredConversations = computed(() => {
    if (!searchQuery.value) return conversations.value
    const q = searchQuery.value.toLowerCase()
    return conversations.value.filter(c => c.title.toLowerCase().includes(q))
  })

  async function fetchConversations() {
    loading.value = true
    try {
      conversations.value = await ConversationService.getAll()
    } catch {
      conversations.value = []
    } finally {
      loading.value = false
    }
  }

  async function createConversation(title?: string): Promise<Conversation> {
    const conv = await ConversationService.create(title)
    conversations.value.unshift(conv)
    return conv
  }

  async function updateConversation(id: string, data: { title?: string; isPinned?: boolean }) {
    const updated = await ConversationService.update(id, data)
    const idx = conversations.value.findIndex(c => c.id === id)
    if (idx !== -1) {
      conversations.value[idx] = { ...conversations.value[idx], ...updated }
    }
    // Re-sort if pinned changed
    if (data.isPinned !== undefined) {
      conversations.value.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
    }
  }

  async function deleteConversation(id: string) {
    await ConversationService.delete(id)
    conversations.value = conversations.value.filter(c => c.id !== id)
  }

  async function shareConversation(id: string) {
    const result = await ConversationService.share(id)
    const idx = conversations.value.findIndex(c => c.id === id)
    if (idx !== -1) {
      conversations.value[idx].isShared = true
    }
    return result.shareToken
  }

  async function unshareConversation(id: string) {
    await ConversationService.unshare(id)
    const idx = conversations.value.findIndex(c => c.id === id)
    if (idx !== -1) {
      conversations.value[idx].isShared = false
    }
  }

  return {
    conversations,
    loading,
    searchQuery,
    filteredConversations,
    fetchConversations,
    createConversation,
    updateConversation,
    deleteConversation,
    shareConversation,
    unshareConversation,
  }
})
