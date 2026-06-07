<script setup lang="ts">
defineEmits<{ click: [] }>()
</script>

<template>
  <button :style="{ width: '100%', padding: '8px 12px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)', textAlign: 'center' }" @click="$emit('click')">
    新建对话
  </button>
</template>
