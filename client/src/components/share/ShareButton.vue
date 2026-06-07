<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useConversationStore } from '@/stores/conversation'
import { ElMessage } from 'element-plus'

const route = useRoute()
const convStore = useConversationStore()

const currentId = computed(() => route.params.id as string | undefined)
const currentConv = computed(() =>
  currentId.value ? convStore.conversations.find(c => c.id === currentId.value) : null,
)

async function handleShare() {
  if (!currentId.value) return

  if (currentConv.value?.isShared) {
    await convStore.unshareConversation(currentId.value)
    ElMessage.success('已取消分享')
  } else {
    const token = await convStore.shareConversation(currentId.value)
    const url = `${window.location.origin}/share/${token}`
    await navigator.clipboard.writeText(url)
    ElMessage.success('分享链接已复制')
  }
}
</script>

<template>
  <el-tooltip :content="currentConv?.isShared ? '取消分享' : '分享对话'" placement="bottom">
    <el-button text size="small" @click="handleShare" :disabled="!currentId">
      <el-icon><Share /></el-icon>
    </el-button>
  </el-tooltip>
</template>
