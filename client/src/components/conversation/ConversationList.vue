<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConversationStore } from '@/stores/conversation'
import type { Conversation } from '@/types/chat'
import { ElMessageBox, ElMessage } from 'element-plus'

defineProps<{ conversations: Conversation[] }>()
defineEmits<{ select: [id: string] }>()

const route = useRoute()
const router = useRouter()
const convStore = useConversationStore()
const currentId = computed(() => route.params.id as string | undefined)
const editingId = ref<string | null>(null)
const editTitle = ref('')

async function handlePin(conv: Conversation) { await convStore.updateConversation(conv.id, { isPinned: !conv.isPinned }) }
function startRename(conv: Conversation) { editingId.value = conv.id; editTitle.value = conv.title }
async function confirmRename() { if (editingId.value && editTitle.value.trim()) await convStore.updateConversation(editingId.value, { title: editTitle.value.trim() }); editingId.value = null }
async function handleDelete(conv: Conversation) {
  try { await ElMessageBox.confirm('确定删除该对话？', '删除', { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }); await convStore.deleteConversation(conv.id); if (currentId.value === conv.id) router.push('/chat'); ElMessage.success('已删除') } catch {}
}
async function handleShare(conv: Conversation) {
  if (conv.isShared) { await convStore.unshareConversation(conv.id); ElMessage.success('已取消分享') }
  else { const token = await convStore.shareConversation(conv.id); await navigator.clipboard.writeText(`${window.location.origin}/share/${token}`); ElMessage.success('分享链接已复制') }
}
</script>

<template>
  <div>
    <div :style="{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }">
      <el-icon :size="14"><Clock /></el-icon>
      历史会话
    </div>
    <div :style="{ display: 'flex', flexDirection: 'column', gap: '2px' }">
      <div
        v-for="conv in conversations"
        :key="conv.id"
        :style="{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', overflow: 'hidden', background: currentId === conv.id ? 'var(--sidebar-active)' : 'transparent', color: 'var(--text-primary)', transition: 'background 0.15s' }"
        @click="$emit('select', conv.id)"
        @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.background = currentId === conv.id ? 'var(--sidebar-active)' : 'transparent'"
      >
        <el-icon :size="14" :style="{ color: 'var(--text-tertiary)', flexShrink: 0 }"><ChatSquare /></el-icon>
        <input v-if="editingId === conv.id" v-model="editTitle" :style="{ flex: 1, minWidth: 0, background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 8px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }" @blur="confirmRename" @keydown.enter="confirmRename" @keydown.escape="editingId = null" @click.stop />
        <span v-else :style="{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '14px' }">{{ conv.title }}</span>
        <el-icon v-if="conv.isPinned" :size="12" style="color:var(--accent-green);flex-shrink:0"><Star /></el-icon>
        <el-dropdown trigger="click" @click.stop>
          <button :style="{ width: '28px', height: '28px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', opacity: 0, flexShrink: 0, transition: 'opacity 0.15s' }" @mouseenter="($event.currentTarget as HTMLElement).style.opacity = '1'" @mouseleave="($event.currentTarget as HTMLElement).style.opacity = '0'">
            <el-icon :size="14"><MoreFilled /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleShare(conv)"><el-icon><Share /></el-icon>{{ conv.isShared ? '取消分享' : '分享' }}</el-dropdown-item>
              <el-dropdown-item @click="startRename(conv)"><el-icon><Edit /></el-icon>重命名</el-dropdown-item>
              <el-dropdown-item @click="handlePin(conv)"><el-icon><Star /></el-icon>{{ conv.isPinned ? '取消置顶' : '置顶' }}</el-dropdown-item>
              <el-dropdown-item @click="handleDelete(conv)"><el-icon style="color:var(--accent-red)"><Delete /></el-icon><span style="color:var(--accent-red)">删除</span></el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
    <div v-if="conversations.length === 0" :style="{ textAlign: 'center', padding: '32px 0', fontSize: '12px', color: 'var(--text-tertiary)' }">暂无历史对话</div>
  </div>
</template>
