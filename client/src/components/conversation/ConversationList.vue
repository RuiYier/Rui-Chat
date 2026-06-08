<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
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
const openMenuId = ref<string | null>(null)

async function handlePin(conv: Conversation) { await convStore.updateConversation(conv.id, { isPinned: !conv.isPinned }); openMenuId.value = null }
function startRename(conv: Conversation) { editingId.value = conv.id; editTitle.value = conv.title; openMenuId.value = null }
async function confirmRename() { if (editingId.value && editTitle.value.trim()) await convStore.updateConversation(editingId.value, { title: editTitle.value.trim() }); editingId.value = null }
async function handleDelete(conv: Conversation) {
  openMenuId.value = null
  try { await ElMessageBox.confirm('确定删除该对话？', '删除', { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }); await convStore.deleteConversation(conv.id); if (currentId.value === conv.id) router.push('/chat'); ElMessage.success('已删除') } catch {}
}
async function handleShare(conv: Conversation) {
  openMenuId.value = null
  if (conv.isShared) { await convStore.unshareConversation(conv.id); ElMessage.success('已取消分享') }
  else { const token = await convStore.shareConversation(conv.id); await navigator.clipboard.writeText(`${window.location.origin}/share/${token}`); ElMessage.success('分享链接已复制') }
}

function toggleMenu(id: string, e: Event) {
  e.stopPropagation()
  openMenuId.value = openMenuId.value === id ? null : id
}

function closeMenu() { openMenuId.value = null }

onMounted(() => document.addEventListener('click', closeMenu))
onUnmounted(() => document.removeEventListener('click', closeMenu))
</script>

<template>
  <div>
    <div :style="{ padding: '8px 12px', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }">
      历史会话
    </div>
    <div :style="{ display: 'flex', flexDirection: 'column', gap: '2px' }">
      <div
        v-for="conv in conversations"
        :key="conv.id"
        :style="{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', background: currentId === conv.id ? 'var(--sidebar-active)' : 'transparent', color: 'var(--text-primary)', transition: 'background 0.15s' }"
        @click="$emit('select', conv.id)"
        @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.background = currentId === conv.id ? 'var(--sidebar-active)' : 'transparent'"
      >
        <input v-if="editingId === conv.id" v-model="editTitle" :style="{ flex: 1, minWidth: 0, background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 8px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }" @blur="confirmRename" @keydown.enter="confirmRename" @keydown.escape="editingId = null" @click.stop />
        <span v-else :style="{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '14px' }">{{ conv.title }}</span>
        <el-icon v-if="conv.isPinned" :size="12" style="color:var(--accent-green);flex-shrink:0"><Star /></el-icon>
        <div style="position:relative;flex-shrink:0">
          <button :style="{ width: '28px', height: '28px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', opacity: 0, transition: 'opacity 0.15s' }" @mouseenter="($event.currentTarget as HTMLElement).style.opacity = '1'" @mouseleave="($event.currentTarget as HTMLElement).style.opacity = '0'" @click="toggleMenu(conv.id, $event)">
            <el-icon :size="14"><MoreFilled /></el-icon>
          </button>
          <!-- Custom dropdown menu -->
          <div v-if="openMenuId === conv.id" :style="{ position: 'absolute', top: '100%', right: '-8px', marginTop: '4px', zIndex: 100, minWidth: '140px', borderRadius: '12px', padding: '4px', background: 'var(--background)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }" @click.stop>
            <div :style="{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: 'var(--text-primary)' }" @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--input-hover)'" @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'" @click="handleShare(conv)">
              <el-icon :size="14"><Share /></el-icon>
              <span>{{ conv.isShared ? '取消分享' : '分享' }}</span>
            </div>
            <div :style="{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: 'var(--text-primary)' }" @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--input-hover)'" @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'" @click="startRename(conv)">
              <el-icon :size="14"><Edit /></el-icon>
              <span>重命名</span>
            </div>
            <div :style="{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: 'var(--text-primary)' }" @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--input-hover)'" @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'" @click="handlePin(conv)">
              <el-icon :size="14"><Star /></el-icon>
              <span>{{ conv.isPinned ? '取消置顶' : '置顶' }}</span>
            </div>
            <div :style="{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: 'var(--accent-red)' }" @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--input-hover)'" @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'" @click="handleDelete(conv)">
              <el-icon :size="14"><Delete /></el-icon>
              <span>删除</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="conversations.length === 0" :style="{ textAlign: 'center', padding: '32px 0', fontSize: '12px', color: 'var(--text-tertiary)' }">暂无历史对话</div>
  </div>
</template>
