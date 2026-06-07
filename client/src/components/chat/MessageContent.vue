<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{ content: string }>()

const rendered = computed(() => {
  if (!props.content) return ''
  return renderMarkdown(props.content)
})
</script>

<template>
  <div class="prose-container" v-html="rendered" />
</template>
