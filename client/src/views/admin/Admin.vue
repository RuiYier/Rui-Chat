<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AdminService } from '@/services/admin.service'
import AdminUsers from '@/components/admin/AdminUsers.vue'
import AdminProviders from '@/components/admin/AdminProviders.vue'
import AdminSettings from '@/components/admin/AdminSettings.vue'
import AdminMcp from '@/components/admin/AdminMcp.vue'
import type { AdminStats } from '@/types/admin'

const router = useRouter()
const activeTab = ref('users')
const stats = ref<AdminStats | null>(null)

const statItems: { key: keyof AdminStats; label: string; icon: string }[] = [
  { key: 'users', label: '用户数', icon: 'User' },
  { key: 'conversations', label: '对话数', icon: 'ChatDotRound' },
  { key: 'messages', label: '消息数', icon: 'ChatLineSquare' },
  { key: 'providers', label: '供应商数', icon: 'Connection' },
]

onMounted(async () => {
  try {
    stats.value = await AdminService.getStats()
  } catch {
    // 统计卡片加载失败不阻塞页面
  }
})
</script>

<template>
  <div
    class="admin-root"
    :style="{
      minHeight: '100vh',
      background: 'var(--background)',
      color: 'var(--text-primary)',
    }"
  >
    <div :style="{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px 64px' }">
      <!-- 标题栏 -->
      <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }">
        <h1 :style="{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }">后台管理</h1>
        <el-button @click="router.push('/chat')">返回对话</el-button>
      </div>

      <!-- 统计卡片 -->
      <div
        v-if="stats"
        :style="{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }"
      >
        <div
          v-for="item in statItems"
          :key="item.key"
          :style="{
            padding: '16px 20px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--sidebar-bg)',
          }"
        >
          <div :style="{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }">
            <el-icon :size="14"><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </div>
          <div :style="{ fontSize: '26px', fontWeight: 700, marginTop: '8px', color: 'var(--text-primary)' }">
            {{ stats[item.key] ?? 0 }}
          </div>
        </div>
      </div>

      <!-- 选项卡 -->
      <el-tabs v-model="activeTab">
        <el-tab-pane label="用户管理" name="users">
          <AdminUsers />
        </el-tab-pane>
        <el-tab-pane label="供应商与模型" name="providers">
          <AdminProviders />
        </el-tab-pane>
        <el-tab-pane label="系统设置" name="settings">
          <AdminSettings />
        </el-tab-pane>
        <el-tab-pane label="MCP 服务" name="mcp">
          <AdminMcp />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<style>
/* Element Plus 变量映射到项目主题（仅作用于后台页面，不影响其他页面） */
.admin-root {
  --el-color-primary: var(--ring);
  --el-color-danger: var(--accent-red);
  --el-color-success: var(--accent-green);
  --el-text-color-primary: var(--text-primary);
  --el-text-color-regular: var(--text-primary);
  --el-text-color-secondary: var(--text-secondary);
  --el-border-color: var(--border);
  --el-border-color-light: var(--border);
  --el-border-color-lighter: var(--border);
  --el-bg-color: var(--background);
  --el-fill-color-blank: var(--background);
  --el-fill-color-light: var(--input-hover);
}

.admin-root .admin-table {
  --el-table-border-color: var(--border);
  --el-table-header-bg-color: transparent;
  --el-table-header-text-color: var(--text-secondary);
  --el-table-text-color: var(--text-primary);
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-row-hover-bg-color: var(--input-hover);
  --el-table-expanded-cell-bg-color: transparent;
}

.admin-root .el-tabs__nav-wrap::after {
  background-color: var(--border);
}

.admin-root .el-tabs__item {
  color: var(--text-secondary);
}

.admin-root .el-tabs__item.is-active {
  color: var(--ring);
  font-weight: 500;
}

.admin-root .el-tabs__active-bar {
  background-color: var(--ring);
}

.admin-root .el-dialog {
  --el-dialog-bg-color: var(--background);
  background-color: var(--background);
}

.admin-root .el-dialog__title {
  color: var(--text-primary);
}
</style>
