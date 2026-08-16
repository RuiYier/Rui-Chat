<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import DOMPurify from 'dompurify'
import { useArtifactStore } from '@/stores/artifact'

const artifactStore = useArtifactStore()
const current = computed(() => artifactStore.current)

const isNarrow = ref(false)
const isDark = ref(false)
const mermaidSvg = ref('')
const mermaidError = ref('')
const mermaidContainer = ref<HTMLElement>()

let mq: MediaQueryList | null = null
let themeObserver: MutationObserver | null = null
let mermaidLib: Awaited<typeof import('mermaid')>['default'] | null = null
let mermaidRenderSeq = 0

function onMqChange(e: MediaQueryListEvent) {
  isNarrow.value = e.matches
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && artifactStore.current) artifactStore.close()
}

onMounted(() => {
  mq = window.matchMedia('(max-width: 767px)')
  isNarrow.value = mq.matches
  mq.addEventListener('change', onMqChange)
  isDark.value = document.documentElement.classList.contains('dark')
  themeObserver = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark')
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  mq?.removeEventListener('change', onMqChange)
  themeObserver?.disconnect()
  document.removeEventListener('keydown', onKeydown)
})

// ---------- Preview source ----------

const srcdoc = computed(() => {
  const artifact = current.value
  if (!artifact) return ''
  if (artifact.lang === 'html') return DOMPurify.sanitize(artifact.code)
  if (artifact.lang === 'svg') {
    const svg = DOMPurify.sanitize(artifact.code)
    return `<!DOCTYPE html><html><head><style>body{margin:0;display:grid;place-items:center;min-height:100vh;background:#fff}</style></head><body>${svg}</body></html>`
  }
  return ''
})

// ---------- Mermaid rendering ----------

async function renderMermaid(code: string) {
  const seq = ++mermaidRenderSeq
  mermaidSvg.value = ''
  mermaidError.value = ''
  try {
    if (!mermaidLib) {
      mermaidLib = (await import('mermaid')).default
    }
    mermaidLib.initialize({
      startOnLoad: false,
      theme: isDark.value ? 'dark' : 'default',
      securityLevel: 'strict',
    })
    const id = `mermaid-artifact-${seq}`
    const { svg } = await mermaidLib.render(id, code)
    if (seq !== mermaidRenderSeq) return
    mermaidSvg.value = svg
  } catch (err: any) {
    if (seq !== mermaidRenderSeq) return
    mermaidError.value = err?.message || String(err)
  }
}

watch(() => artifactStore.current, (artifact) => {
  if (artifact?.lang === 'mermaid' && artifact.code) {
    renderMermaid(artifact.code)
  }
})

// Re-render mermaid diagram when theme changes
watch(isDark, () => {
  const artifact = artifactStore.current
  if (artifact?.lang === 'mermaid' && artifact.code) {
    renderMermaid(artifact.code)
  }
})

// ---------- Actions ----------

const langLabel = computed(() => {
  if (!current.value) return ''
  return { html: 'HTML', svg: 'SVG', mermaid: 'Mermaid' }[current.value.lang]
})

async function handleCopy() {
  if (!current.value) return
  try {
    await navigator.clipboard.writeText(current.value.code)
    ElMessage.success('已复制')
  } catch {}
}

function handleDownload() {
  const artifact = current.value
  if (!artifact) return
  let blob: Blob | null = null
  let filename = 'artifact'
  if (artifact.lang === 'html') {
    blob = new Blob([artifact.code], { type: 'text/html;charset=utf-8' })
    filename = 'artifact.html'
  } else if (artifact.lang === 'svg') {
    blob = new Blob([artifact.code], { type: 'image/svg+xml;charset=utf-8' })
    filename = 'artifact.svg'
  } else {
    const svgEl = mermaidContainer.value?.querySelector('svg')
    if (!svgEl) {
      ElMessage.warning('图表尚未渲染完成，无法下载')
      return
    }
    blob = new Blob([svgEl.outerHTML], { type: 'image/svg+xml;charset=utf-8' })
    filename = 'artifact.svg'
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div v-if="current" :style="isNarrow
    ? { position: 'absolute', inset: 0, zIndex: 30, display: 'flex', flexDirection: 'column' }
    : { width: '45%', minWidth: '480px', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', background: 'var(--background)' }">
    <!-- Narrow-screen backdrop -->
    <div
      v-if="isNarrow"
      :style="{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }"
      @click="artifactStore.close()"
    />

    <div :style="{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--background)' }">
    <!-- Header -->
    <div :style="{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }">
      <span :style="{ padding: '2px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, background: 'var(--input-bg)', color: 'var(--text-secondary)', cursor: 'default', userSelect: 'none' }">{{ langLabel }}</span>
      <div style="flex:1" />
      <!-- Copy -->
      <button
        :style="{ width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', transition: 'background 0.15s' }"
        title="复制"
        @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--input-bg)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'"
        @click="handleCopy"
      >
        <el-icon :size="14"><CopyDocument /></el-icon>
      </button>
      <!-- Download -->
      <button
        :style="{ width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', transition: 'background 0.15s' }"
        title="下载"
        @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--input-bg)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'"
        @click="handleDownload"
      >
        <el-icon :size="14"><Download /></el-icon>
      </button>
      <!-- Close -->
      <button
        :style="{ width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', transition: 'background 0.15s' }"
        title="关闭"
        @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--input-bg)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'"
        @click="artifactStore.close()"
      >
        <el-icon :size="14"><Close /></el-icon>
      </button>
    </div>

    <!-- Body -->
    <div :style="{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }">
      <!-- HTML / SVG: sandboxed iframe -->
      <iframe
        v-if="current.lang === 'html' || current.lang === 'svg'"
        sandbox="allow-scripts"
        :srcdoc="srcdoc"
        :style="{ width: '100%', height: '100%', border: 'none', background: '#fff', display: 'block' }"
      />

      <!-- Mermaid -->
      <div v-else :style="{ width: '100%', height: '100%', overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0 }">
        <!-- Render error -->
        <div v-if="mermaidError" :style="{ width: '100%', maxWidth: '640px', padding: '16px', borderRadius: '8px', background: 'var(--input-bg)', border: '1px solid var(--border)' }">
          <pre :style="{ margin: 0, padding: 0, background: 'transparent', fontSize: '12px', lineHeight: 1.6, color: 'var(--accent-red)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', overflow: 'visible' }">{{ mermaidError }}</pre>
          <p :style="{ marginTop: '8px', fontSize: '13px', color: 'var(--text-tertiary)', cursor: 'default', userSelect: 'none' }">图表语法可能有误</p>
        </div>
        <!-- Rendered diagram -->
        <div
          v-else-if="mermaidSvg"
          ref="mermaidContainer"
          v-html="mermaidSvg"
          :style="{ maxWidth: '100%', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }"
        />
        <!-- Loading -->
        <div v-else :style="{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', color: 'var(--text-tertiary)' }">
          <el-icon class="is-loading" :size="24"><Loading /></el-icon>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>
