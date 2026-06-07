<script setup lang="ts">
defineEmits<{ click: [] }>()
</script>

<template>
  <button :style="{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)', textAlign: 'left' }" @click="$emit('click')">
    <el-icon :size="16"><EditPen /></el-icon>
    新建对话
  </button>
</template>
