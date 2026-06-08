<script setup lang="ts">
import { useConversationStore } from '@/stores/conversation'
import ConversationList from '@/components/conversation/ConversationList.vue'
import ConversationSearch from '@/components/conversation/ConversationSearch.vue'
import NewChatButton from '@/components/conversation/NewChatButton.vue'

const props = defineProps<{ collapsed: boolean }>()
defineEmits<{
  selectConversation: [id: string]
  newChat: []
  toggle: []
}>()

const convStore = useConversationStore()
</script>

<template>
  <aside
    :style="{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: collapsed ? '64px' : '256px',
      background: 'var(--sidebar-bg)',
      transition: 'width 0.3s',
      borderRight: '1px solid var(--border)',
      overflow: 'hidden',
      flexShrink: 0,
    }"
  >
    <!-- Logo -->
    <div style="padding:12px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div v-if="!collapsed" style="display:flex;align-items:center;gap:10px;cursor:default;user-select:none">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#1a1a1a" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.37 0 0 5.37 0 12C0 18.09 4.53 23.11 10.4 23.9V21.5A1.59 1.59 0 0 0 9.32 19.97A8.41 8.41 0 0 1 3.6 11.8A8.37 8.37 0 0 1 12.09 3.6A8.4 8.4 0 0 1 20.4 12.31L20.39 12.38A8.68 8.68 0 0 1 20.36 12.76C20.36 12.83 20.35 12.9 20.34 12.96C20.34 13.04 20.33 13.12 20.32 13.19L20.3 13.29C19.27 20.07 10.45 23.87 10.4 23.9C10.92 23.97 11.46 24 12 24C18.63 24 24 18.63 24 12S18.63 0 12 0Z"/>
          </svg>
          <span style="font-size:20px;font-weight:700;color:#1a1a1a;font-family:'Geom',sans-serif;cursor:default">Rui Chat</span>
        </div>
        <button
          :style="{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
          }"
          @click="$emit('toggle')"
        >
          <el-icon :size="18"><Fold v-if="!collapsed" /><Expand v-else /></el-icon>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div v-if="!collapsed" style="display:flex;flex:1;flex-direction:column;min-height:0;padding:0 12px;gap:8px">
      <NewChatButton @click="$emit('newChat')" />
      <ConversationSearch v-model="convStore.searchQuery" />
      <div style="flex:1;min-height:0;overflow-y:auto">
        <ConversationList
          :conversations="convStore.filteredConversations"
          @select="$emit('selectConversation', $event)"
        />
      </div>
    </div>

    <!-- Bottom -->
    <div v-if="!collapsed" :style="{ padding: '12px', borderTop: '1px solid var(--border)' }">
      <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-tertiary);cursor:default;user-select:none">
        <span style="position:relative;display:flex;width:8px;height:8px">
          <span style="position:absolute;inset:0;border-radius:50%;background:#4ade80;opacity:0.75;animation:ping 1s cubic-bezier(0,0,0.2,1) infinite"></span>
          <span style="position:relative;display:inline-flex;border-radius:50%;width:8px;height:8px;background:#22c55e"></span>
        </span>
        MiMo 在线
      </div>
    </div>
  </aside>
</template>
