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
        <div v-if="!collapsed" style="display:flex;align-items:center;gap:10px">
          <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.30047 8.77631L12.0474 23H16.3799L6.63183 8.77631H2.30047ZM6.6285 16.6762L2.29492 23H6.63072L8.79584 19.8387L6.6285 16.6762ZM17.3709 1L9.88007 11.9308L12.0474 15.0944L21.7067 1H17.3709ZM18.1555 7.76374V23H21.7067V2.5818L18.1555 7.76374Z" fill="#1a1a1a" />
          </svg>
          <span style="font-size:20px;font-weight:700;color:#1a1a1a">Rui Chat</span>
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
      <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-tertiary)">
        <span style="position:relative;display:flex;width:8px;height:8px">
          <span style="position:absolute;inset:0;border-radius:50%;background:#4ade80;opacity:0.75;animation:ping 1s cubic-bezier(0,0,0.2,1) infinite"></span>
          <span style="position:relative;display:inline-flex;border-radius:50%;width:8px;height:8px;background:#22c55e"></span>
        </span>
        MiMo 在线
      </div>
    </div>
  </aside>
</template>
