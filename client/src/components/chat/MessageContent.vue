<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown, extractArtifacts } from '@/utils/markdown'
import { useArtifactStore } from '@/stores/artifact'

const props = defineProps<{ content: string }>()
const artifactStore = useArtifactStore()

const rendered = computed(() => {
  if (!props.content) return ''
  return renderMarkdown(props.content, { artifacts: true })
})

// Artifact list in document order - idx matches data-artifact-idx emitted by the highlight callback
const artifacts = computed(() => extractArtifacts(props.content))

function handleClick(e: MouseEvent) {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-artifact-btn]')
  if (!btn) return
  const idx = Number(btn.dataset.artifactIdx)
  const artifact = artifacts.value[idx]
  if (artifact) artifactStore.open(artifact)
}
</script>

<template>
  <div class="prose-container" v-html="rendered" @click="handleClick" />
</template>
