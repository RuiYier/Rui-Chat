<script setup lang="ts">
const model = defineModel<string>()
</script>

<template>
  <div :style="{ position: 'relative', marginBottom: '8px' }">
    <el-icon :style="{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }" :size="14"><Search /></el-icon>
    <input
      v-model="model"
      placeholder="搜索对话..."
      :style="{ width: '100%', height: '36px', paddingLeft: '36px', paddingRight: '36px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }"
    />
    <button v-if="model" :style="{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', width: '28px', height: '28px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)' }" @click="model = ''">
      <el-icon :size="14"><Close /></el-icon>
    </button>
  </div>
</template>
