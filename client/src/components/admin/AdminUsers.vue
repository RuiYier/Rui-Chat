<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { AdminService } from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth'
import { formatDateTime } from './date-format'
import type { AdminUser } from '@/types/admin'

const authStore = useAuthStore()

const users = ref<AdminUser[]>([])
const loading = ref(false)

async function loadUsers() {
  loading.value = true
  try {
    users.value = await AdminService.getUsers()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '获取用户列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadUsers)

function isSelf(row: AdminUser) {
  return row.id === authStore.user?.id
}

// ===== 提权 / 降权 =====
async function toggleRole(row: AdminUser) {
  const nextRole = row.role === 'admin' ? 'user' : 'admin'
  try {
    await AdminService.updateUser(row.id, { role: nextRole })
    ElMessage.success(nextRole === 'admin' ? '已提权为管理员' : '已降权为普通用户')
    await loadUsers()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '操作失败')
  }
}

// ===== 删除 =====
async function handleDelete(row: AdminUser) {
  try {
    await ElMessageBox.confirm(`确定删除用户「${row.username}」吗？该操作不可恢复。`, '删除用户', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await AdminService.deleteUser(row.id)
    ElMessage.success('已删除用户')
    await loadUsers()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '删除失败')
  }
}

// ===== 新建用户 =====
const createVisible = ref(false)
const creating = ref(false)
const createForm = reactive({ username: '', password: '', email: '', name: '', role: 'user' })

function openCreate() {
  createForm.username = ''
  createForm.password = ''
  createForm.email = ''
  createForm.name = ''
  createForm.role = 'user'
  createVisible.value = true
}

async function handleCreate() {
  if (!createForm.username || !createForm.password) {
    ElMessage.warning('请填写用户名和密码')
    return
  }
  creating.value = true
  try {
    await AdminService.createUser({
      username: createForm.username,
      password: createForm.password,
      email: createForm.email || undefined,
      name: createForm.name || undefined,
      role: createForm.role,
    })
    ElMessage.success('用户创建成功')
    createVisible.value = false
    await loadUsers()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '创建失败')
  } finally {
    creating.value = false
  }
}

// ===== 编辑用户 =====
const editVisible = ref(false)
const saving = ref(false)
const editTarget = ref<AdminUser | null>(null)
const editForm = reactive({ name: '', email: '', password: '' })

function openEdit(row: AdminUser) {
  editTarget.value = row
  editForm.name = row.name || ''
  editForm.email = row.email || ''
  editForm.password = ''
  editVisible.value = true
}

async function handleEdit() {
  if (!editTarget.value) return
  const body: { name?: string; email?: string; password?: string } = {}
  if (editForm.name) body.name = editForm.name
  if (editForm.email) body.email = editForm.email
  if (editForm.password) body.password = editForm.password
  if (Object.keys(body).length === 0) {
    editVisible.value = false
    return
  }
  saving.value = true
  try {
    await AdminService.updateUser(editTarget.value.id, body)
    ElMessage.success('已保存')
    editVisible.value = false
    await loadUsers()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <!-- 顶部操作栏 -->
    <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }">
      <span :style="{ fontSize: '13px', color: 'var(--text-tertiary)' }">共 {{ users.length }} 个用户</span>
      <div :style="{ display: 'flex', gap: '8px' }">
        <el-button size="small" @click="loadUsers" :loading="loading">刷新</el-button>
        <el-button size="small" type="primary" @click="openCreate">新建用户</el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="users"
      empty-text="暂无用户"
      class="admin-table"
      :style="{ width: '100%' }"
    >
      <el-table-column prop="username" label="用户名" min-width="120" show-overflow-tooltip />
      <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ row.email || '-' }}</template>
      </el-table-column>
      <el-table-column prop="name" label="昵称" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ row.name || '-' }}</template>
      </el-table-column>
      <el-table-column label="角色" width="90">
        <template #default="{ row }">
          <el-tag v-if="row.role === 'admin'" type="danger" effect="light" size="small">管理员</el-tag>
          <el-tag v-else type="info" effect="light" size="small">用户</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="对话数" width="90">
        <template #default="{ row }">{{ row._count?.conversations ?? 0 }}</template>
      </el-table-column>
      <el-table-column label="注册时间" width="150">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button
            size="small"
            link
            type="primary"
            :disabled="isSelf(row)"
            @click="toggleRole(row)"
          >{{ row.role === 'admin' ? '降权' : '提权' }}</el-button>
          <el-button size="small" link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button
            size="small"
            link
            type="danger"
            :disabled="isSelf(row)"
            @click="handleDelete(row)"
          >删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新建用户对话框 -->
    <el-dialog v-model="createVisible" title="新建用户" width="448px" :close-on-click-modal="false">
      <el-form label-position="top" @submit.prevent="handleCreate">
        <el-form-item label="用户名" required>
          <el-input v-model="createForm.username" placeholder="用户名" />
        </el-form-item>
        <el-form-item label="密码" required>
          <el-input v-model="createForm.password" type="password" placeholder="密码" show-password />
        </el-form-item>
        <el-form-item label="邮箱 (可选)">
          <el-input v-model="createForm.email" placeholder="邮箱" />
        </el-form-item>
        <el-form-item label="昵称 (可选)">
          <el-input v-model="createForm.name" placeholder="昵称" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="createForm.role" :style="{ width: '100%' }">
            <el-option label="用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>

    <!-- 编辑用户对话框 -->
    <el-dialog v-model="editVisible" title="编辑用户" width="448px" :close-on-click-modal="false">
      <el-form label-position="top" @submit.prevent="handleEdit">
        <el-form-item label="昵称">
          <el-input v-model="editForm.name" placeholder="留空则不修改" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="editForm.email" placeholder="留空则不修改" />
        </el-form-item>
        <el-form-item label="重置密码">
          <el-input v-model="editForm.password" type="password" placeholder="留空则不修改" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
