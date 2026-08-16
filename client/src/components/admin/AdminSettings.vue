<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { AdminService } from '@/services/admin.service'
import type { AdminSettings } from '@/types/admin'

const saved = ref<AdminSettings | null>(null)
const loading = ref(false)
const saving = ref(false)
const form = reactive<AdminSettings>({
  enableVoiceInput: true,
  enableWebSearch: true,
  enableTts: true,
  allowRegistration: true,
})

const settingItems: { key: keyof AdminSettings; title: string; description: string }[] = [
  { key: 'enableVoiceInput', title: '语音输入', description: '关闭后用户侧不显示麦克风按钮' },
  { key: 'enableWebSearch', title: '联网搜索', description: '关闭后用户侧不显示联网开关' },
  { key: 'enableTts', title: '文本转语音 TTS', description: '关闭后用户侧不显示朗读按钮与音色选择' },
  { key: 'allowRegistration', title: '开放注册', description: '关闭后不允许新用户注册' },
]

const changedCount = computed(() => {
  if (!saved.value) return 0
  return settingItems.filter(item => form[item.key] !== saved.value![item.key]).length
})

onMounted(async () => {
  loading.value = true
  try {
    const data = await AdminService.getSettings()
    saved.value = data
    Object.assign(form, data)
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '获取设置失败')
  } finally {
    loading.value = false
  }
})

async function handleSave() {
  if (!saved.value || changedCount.value === 0) return
  const diff: Partial<AdminSettings> = {}
  for (const item of settingItems) {
    if (form[item.key] !== saved.value[item.key]) diff[item.key] = form[item.key]
  }
  saving.value = true
  try {
    const updated = await AdminService.updateSettings(diff)
    saved.value = updated
    Object.assign(form, updated)
    ElMessage.success('设置已保存')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-loading="loading">
    <div
      :style="{
        borderRadius: '12px',
        border: '1px solid var(--border)',
        background: 'var(--sidebar-bg)',
      }"
    >
      <div
        v-for="(item, index) in settingItems"
        :key="item.key"
        :style="{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          padding: '16px 20px',
          borderBottom: index < settingItems.length - 1 ? '1px solid var(--border)' : 'none',
        }"
      >
        <div>
          <div :style="{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }">{{ item.title }}</div>
          <div :style="{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }">{{ item.description }}</div>
        </div>
        <el-switch v-model="form[item.key]" />
      </div>
    </div>

    <div :style="{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }">
      <el-button type="primary" :loading="saving" :disabled="changedCount === 0" @click="handleSave">保存设置</el-button>
      <span v-if="changedCount > 0" :style="{ fontSize: '12px', color: 'var(--text-tertiary)' }">有 {{ changedCount }} 项未保存的修改</span>
    </div>
  </div>
</template>
