<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'

const authStore = useAuthStore()
const router = useRouter()

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', { confirmButtonText: '确定', cancelButtonText: '取消' })
    authStore.logout()
    router.push('/')
  } catch {}
}

function cycleTheme() {
  document.documentElement.classList.toggle('dark')
  localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light')
}
</script>

<template>
  <header
    :style="{
      position: 'sticky',
      top: 0,
      zIndex: 10,
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      background: 'var(--background)',
      flexShrink: 0,
    }"
  >
    <div style="display:flex;align-items:center">
      <slot />
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <button
        :style="{ width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }"
        @click="cycleTheme"
      >
        <el-icon :size="18"><Sunny /></el-icon>
      </button>
      <el-dropdown v-if="authStore.user" trigger="click">
        <div
          :style="{
            width: '36px', height: '36px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '14px', fontWeight: 500,
            background: 'var(--button-primary-bg)', color: '#fff',
          }"
        >
          {{ (authStore.user.name || authStore.user.username || 'U')[0].toUpperCase() }}
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item disabled>
              <div style="padding:4px 0">
                <div style="font-weight:500">{{ authStore.user.name || authStore.user.username }}</div>
                <div style="font-size:12px;color:var(--text-tertiary)">{{ authStore.user.email }}</div>
              </div>
            </el-dropdown-item>
            <el-dropdown-item divided @click="cycleTheme">
              <el-icon><Sunny /></el-icon> 切换主题
            </el-dropdown-item>
            <el-dropdown-item @click="handleLogout">
              <el-icon><SwitchButton /></el-icon> 退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>
