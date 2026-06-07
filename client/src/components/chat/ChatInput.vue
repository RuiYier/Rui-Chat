<script setup lang="ts">
import { ref, computed } from 'vue'
import { useChatStore } from '@/stores/chat'
import { UploadService } from '@/services/upload.service'
import { VoiceService } from '@/services/voice.service'
import { ElMessage } from 'element-plus'
import { VOICES } from '@/constants/voices'

const emit = defineEmits<{ send: [content: string, attachments?: any[]] }>()
const chatStore = useChatStore()
const inputText = ref('')
const attachments = ref<any[]>([])
const isRecording = ref(false)
const mediaRecorder = ref<MediaRecorder | null>(null)
const showVoiceMenu = ref(false)
const canSend = computed(() => inputText.value.trim().length > 0 && !chatStore.streaming)

function handleSend() {
  if (!canSend.value) return
  const content = inputText.value.trim()
  inputText.value = ''
  emit('send', content, attachments.value.length > 0 ? attachments.value : undefined)
  attachments.value = []
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) { for (const f of Array.from(input.files)) processFile(f); input.value = '' }
}

async function processFile(file: File) {
  try {
    const r = await UploadService.uploadFile(file)
    attachments.value.push(r)
    ElMessage.success(`已添加: ${r.name}`)
  } catch (err: any) { ElMessage.error(err.response?.data?.message || '上传失败') }
}

function removeAttachment(i: number) { attachments.value.splice(i, 1) }

async function toggleRecording() {
  if (isRecording.value) { stopRecording(); return }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    rec.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      const blob = new Blob(chunks, { type: 'audio/webm' })
      try {
        ElMessage.info('正在识别...')
        const text = await VoiceService.speechToText(blob)
        if (text) { inputText.value += (inputText.value ? '\n' : '') + text; ElMessage.success('识别完成') }
        else ElMessage.warning('未识别到内容')
      } catch { ElMessage.error('识别失败') }
    }
    rec.start(); mediaRecorder.value = rec; isRecording.value = true
  } catch { ElMessage.error('无法访问麦克风') }
}

function stopRecording() {
  if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') mediaRecorder.value.stop()
  isRecording.value = false
}

function selectVoice(id: string) { chatStore.setVoice(id); showVoiceMenu.value = false }
</script>

<template>
  <div :style="{ flexShrink: 0, background: 'var(--background)', position: 'relative' }">
    <div :style="{ maxWidth: '896px', margin: '0 auto', padding: '16px 24px' }">
      <!-- File chips -->
      <div v-if="attachments.length > 0" :style="{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }">
        <div v-for="(att, i) in attachments" :key="i" :style="{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px', fontSize: '14px', background: att.name.endsWith('.md') ? '#FFF7ED' : '#EFF6FF', border: att.name.endsWith('.md') ? '1px solid #FDBA74' : '1px solid #93C5FD', color: att.name.endsWith('.md') ? '#C2410C' : '#1D4ED8' }">
          <span>{{ att.name }}</span>
          <button style="background:none;border:none;cursor:pointer;opacity:0.7" @click="removeAttachment(i)"><el-icon :size="12"><Close /></el-icon></button>
        </div>
      </div>

      <!-- Recording -->
      <div v-if="isRecording" :style="{ borderRadius: '16px', padding: '16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '16px', background: 'linear-gradient(to right, #FEF2F2, #FDF2F8)', border: '1px solid #FECACA' }">
        <div style="position:relative">
          <div :style="{ position: 'absolute', width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239,68,68,0.2)', animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite' }"></div>
          <div :style="{ position: 'relative', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EF4444' }">
            <el-icon :size="20" color="#fff"><Microphone /></el-icon>
          </div>
        </div>
        <div style="flex:1">
          <p style="font-size:14px;font-weight:500;color:#DC2626;margin:0">正在录音...</p>
          <p style="font-size:12px;color:#F87171;margin:0">点击停止按钮结束录音</p>
        </div>
        <button :style="{ height: '32px', padding: '0 16px', borderRadius: '8px', fontSize: '14px', color: '#fff', background: '#EF4444', border: 'none', cursor: 'pointer' }" @click="stopRecording">停止</button>
      </div>

      <!-- Input card -->
      <div :style="{ borderRadius: '24px', padding: '12px', background: 'var(--background)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', transition: 'box-shadow 0.2s' }">
        <!-- Text -->
        <input
          v-model="inputText"
          :placeholder="isRecording ? '正在录音...' : '输入消息...'"
          :style="{ width: '100%', height: '48px', padding: '0 20px', fontSize: '15px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)' }"
          :disabled="isRecording"
          @keydown="handleKeydown"
        />

        <!-- Toolbar -->
        <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 8px 0' }">
          <div :style="{ display: 'flex', alignItems: 'center', gap: '4px' }">
            <!-- File -->
            <label :style="{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-tertiary)' }">
              <input type="file" style="display:none" accept=".txt,.md" multiple @change="handleFileSelect" />
              <el-icon :size="18"><Paperclip /></el-icon>
            </label>

            <!-- Voice -->
            <div style="position:relative">
              <button :style="{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)' }" @click="showVoiceMenu = !showVoiceMenu">
                <el-icon :size="18"><Headset /></el-icon>
              </button>
              <div v-if="showVoiceMenu" :style="{ position: 'absolute', bottom: '100%', left: 0, marginBottom: '4px', width: '192px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 50, overflow: 'hidden' }">
                <div :style="{ padding: '4px 0', maxHeight: '30vh', overflowY: 'auto' }">
                  <div v-for="voice in VOICES" :key="voice.id" :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', fontSize: '14px', cursor: 'pointer', color: 'var(--text-primary)', background: chatStore.selectedVoice === voice.id ? 'var(--input-bg)' : 'transparent' }" @click="selectVoice(voice.id)">
                    <span>{{ voice.name }}</span>
                    <span :style="{ fontSize: '12px', color: 'var(--text-tertiary)' }">{{ voice.gender === 'Female' ? '女' : '男' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Thinking -->
            <button :style="{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', background: chatStore.config.thinking ? 'var(--accent-thinking)' : 'transparent', color: chatStore.config.thinking ? '#fff' : 'var(--text-tertiary)' }" @click="chatStore.toggleThinking()">
              <el-icon :size="18"><MagicStick /></el-icon>
            </button>

            <!-- Search -->
            <button :style="{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', background: chatStore.config.webSearch ? '#3B82F6' : 'transparent', color: chatStore.config.webSearch ? '#fff' : 'var(--text-tertiary)' }" @click="chatStore.toggleWebSearch()">
              <el-icon :size="18"><Search /></el-icon>
            </button>

            <!-- Mic -->
            <button :style="{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', background: isRecording ? 'var(--accent-red)' : 'transparent', color: isRecording ? '#fff' : 'var(--text-tertiary)' }" @click="toggleRecording">
              <el-icon :size="18"><Mic /></el-icon>
            </button>
          </div>

          <!-- Send -->
          <button
            v-if="chatStore.streaming"
            :style="{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', background: 'var(--button-primary-bg)', color: '#fff' }"
          >
            <el-icon :size="16"><VideoPause /></el-icon>
          </button>
          <button
            v-else
            :style="{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: canSend ? 'pointer' : 'not-allowed', background: canSend ? 'var(--button-primary-bg)' : 'var(--input-bg)', color: canSend ? '#fff' : 'var(--text-tertiary)' }"
            :disabled="!canSend"
            @click="handleSend"
          >
            <el-icon :size="16"><Promotion /></el-icon>
          </button>
        </div>
      </div>

      <p :style="{ textAlign: 'center', fontSize: '12px', marginTop: '12px', color: 'var(--text-tertiary)' }">内容由 AI 生成，仅供参考</p>
    </div>

    <div v-if="showVoiceMenu" style="position:fixed;inset:0;z-index:40" @click="showVoiceMenu = false" />
  </div>
</template>
