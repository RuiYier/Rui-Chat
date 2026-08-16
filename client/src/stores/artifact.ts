import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Artifact } from '@/utils/markdown'

export const useArtifactStore = defineStore('artifact', () => {
  const current = ref<Artifact | null>(null)

  function open(artifact: Artifact) {
    current.value = artifact
  }

  function close() {
    current.value = null
  }

  return { current, open, close }
})
