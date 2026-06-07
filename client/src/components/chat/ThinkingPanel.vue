<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ content: string; isStreaming: boolean }>()
const expanded = ref(false)
const contentRef = ref<HTMLElement>()

watch(() => props.isStreaming, (s) => { if (!s) expanded.value = false })
watch(() => props.content, () => {
  if (props.isStreaming && contentRef.value) contentRef.value.scrollTop = contentRef.value.scrollHeight
})
</script>

<template>
  <div :style="{ marginBottom: '16px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--input-bg)' }">
    <button :style="{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)' }" @click="expanded = !expanded">
      <div :style="{ display: 'flex', alignItems: 'center', gap: '8px' }">
        <el-icon :size="14" style="color:var(--accent-thinking)"><MagicStick /></el-icon>
        <span style="font-size:14px;font-weight:500">思考过程</span>
        <span v-if="isStreaming" style="position:relative;display:flex;width:8px;height:8px">
          <span style="position:absolute;inset:0;border-radius:50%;background:#4ade80;opacity:0.75;animation:ping 1s cubic-bezier(0,0,0.2,1) infinite"></span>
          <span style="position:relative;display:inline-flex;border-radius:50%;width:8px;height:8px;background:#22c55e"></span>
        </span>
      </div>
      <el-icon :size="14" :style="{ color: 'var(--text-tertiary)', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }"><ArrowDown /></el-icon>
    </button>
    <div v-show="expanded" ref="contentRef" :style="{ maxHeight: '500px', overflowY: 'auto', transition: 'all 0.2s ease-out' }">
      <div :style="{ padding: '0 16px 16px' }">
        <div :style="{ fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: 1.75, color: 'var(--text-secondary)' }">{{ content }}</div>
      </div>
    </div>
  </div>
</template>
