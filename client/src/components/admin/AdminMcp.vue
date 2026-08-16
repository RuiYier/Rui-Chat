<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { AdminService } from '@/services/admin.service'
import type { McpServerBody } from '@/services/admin.service'
import { formatDateTime } from './date-format'
import type { McpServer, McpTool } from '@/types/admin'

type SwitchValue = boolean | string | number

const servers = ref<McpServer[]>([])
const loading = ref(false)

async function loadServers(silent = false) {
  if (!silent) loading.value = true
  try {
    servers.value = await AdminService.getMcpServers()
  } catch (err: any) {
    if (!silent) ElMessage.error(err.response?.data?.message || '获取 MCP 服务器列表失败')
  } finally {
    if (!silent) loading.value = false
  }
}

onMounted(() => loadServers())

// ===== 启用开关（乐观更新 + 失败回滚 + 静默刷新） =====
async function toggleEnabled(row: McpServer, value: SwitchValue) {
  const val = Boolean(value)
  const prev = row.isEnabled
  row.isEnabled = val
  try {
    await AdminService.updateMcpServer(row.id, { transport: row.transport, isEnabled: val })
    await loadServers(true)
  } catch (err: any) {
    row.isEnabled = prev
    ElMessage.error(err.response?.data?.message || '操作失败')
  }
}

// ===== 展示辅助 =====
function stdioSummary(row: McpServer): string {
  const args = row.args?.length ? ' ' + row.args.join(' ') : ''
  return `${row.command || '-'}${args}`
}

function statusText(status: McpServer['status']): string {
  if (status === 'connected') return '已连接'
  if (status === 'error') return '连接失败'
  return '已禁用'
}

function statusColor(status: McpServer['status']): string {
  if (status === 'connected') return 'var(--accent-green)'
  if (status === 'error') return 'var(--accent-red)'
  return 'var(--text-tertiary)'
}

// ===== 新建 / 编辑 =====
const dialog = ref(false)
const editMode = ref(false)
const targetId = ref<string | null>(null)
const saving = ref(false)
const form = reactive({ name: '', transport: 'stdio' as 'stdio' | 'http', command: '', argsText: '', url: '', headersText: '', isEnabled: true })
const headersDirty = ref(false)

function openCreate() {
  editMode.value = false
  targetId.value = null
  form.name = ''
  form.transport = 'stdio'
  form.command = ''
  form.argsText = ''
  form.url = ''
  form.headersText = ''
  form.isEnabled = true
  headersDirty.value = false
  testTools.value = []
  dialog.value = true
}

function openEdit(row: McpServer) {
  editMode.value = true
  targetId.value = row.id
  form.name = row.name
  form.transport = row.transport
  form.command = row.command || ''
  form.argsText = row.args?.length ? row.args.join('\n') : ''
  form.url = row.url || ''
  form.headersText = Object.entries(row.headersMasked || {}).map(([k, v]) => `${k}: ${v}`).join('\n')
  form.isEnabled = row.isEnabled
  headersDirty.value = false
  testTools.value = []
  dialog.value = true
}

function parseArgs(): string[] {
  return form.argsText.split('\n').map(a => a.trim()).filter(a => a.length > 0)
}

function parseHeadersText(text: string, warn: boolean): Record<string, string> {
  const headers: Record<string, string> = {}
  let malformed = 0
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const idx = line.indexOf(':')
    const key = idx > 0 ? line.slice(0, idx).trim() : ''
    const value = idx > 0 ? line.slice(idx + 1).trim() : ''
    if (!key || !value) { malformed++; continue }
    headers[key] = value
  }
  if (warn && malformed > 0) ElMessage.warning(`已忽略 ${malformed} 行格式错误的请求头`)
  return headers
}

/**
 * 编辑模式下请求头未修改（或值仍为掩码 ***）时不发送，服务端保留原值；
 * 清空后保存则发送空对象以移除全部请求头。
 */
function resolveHeaders(): Record<string, string> | undefined {
  const parsed = parseHeadersText(form.headersText, true)
  if (!editMode.value) return Object.keys(parsed).length > 0 ? parsed : undefined
  if (!headersDirty.value) return undefined
  const values = Object.values(parsed)
  if (values.length > 0 && values.every(v => v === '***')) return undefined
  return parsed
}

function validateConfig(): boolean {
  if (form.transport === 'stdio' && !form.command) {
    ElMessage.warning('请填写启动命令')
    return false
  }
  if (form.transport === 'http' && !form.url) {
    ElMessage.warning('请填写 URL')
    return false
  }
  return true
}

function validateAll(): boolean {
  if (!/^[a-zA-Z0-9_-]{1,32}$/.test(form.name)) {
    ElMessage.warning('名称仅支持字母、数字、下划线、连字符，长度 1-32')
    return false
  }
  return validateConfig()
}

async function handleSubmit() {
  if (!validateAll()) return
  saving.value = true
  try {
    const body: McpServerBody = { name: form.name, transport: form.transport, isEnabled: form.isEnabled }
    if (form.transport === 'stdio') {
      body.command = form.command
      const args = parseArgs()
      if (args.length > 0) body.args = args
    } else {
      body.url = form.url
      const headers = resolveHeaders()
      if (headers) body.headers = headers
    }
    if (editMode.value && targetId.value) {
      await AdminService.updateMcpServer(targetId.value, body)
      ElMessage.success('MCP 服务器已更新')
    } else {
      await AdminService.createMcpServer(body)
      ElMessage.success('MCP 服务器已创建')
    }
    dialog.value = false
    await loadServers()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

// ===== 测试连接 =====
const testing = ref(false)
const testTools = ref<McpTool[]>([])

async function handleTest() {
  if (!validateConfig()) return
  testing.value = true
  testTools.value = []
  try {
    const body: Omit<McpServerBody, 'name' | 'isEnabled'> = { transport: form.transport }
    if (form.transport === 'stdio') {
      body.command = form.command
      const args = parseArgs()
      if (args.length > 0) body.args = args
    } else {
      body.url = form.url
      const headers = resolveHeaders()
      if (headers) body.headers = headers
    }
    const result = await AdminService.testMcpServer(body)
    if (result.ok) {
      testTools.value = result.tools || []
      ElMessage.success(`连接成功，发现 ${testTools.value.length} 个工具`)
    } else {
      ElMessage.error(result.message || '连接失败')
    }
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '测试失败')
  } finally {
    testing.value = false
  }
}

// ===== 删除 =====
async function handleDelete(row: McpServer) {
  try {
    await ElMessageBox.confirm(`确定删除 MCP 服务器「${row.name}」吗？其工具将从对话中移除。`, '删除 MCP 服务器', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await AdminService.deleteMcpServer(row.id)
    ElMessage.success('已删除 MCP 服务器')
    await loadServers()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '删除失败')
  }
}
</script>

<template>
  <div>
    <!-- 提示 + 顶部操作栏 -->
    <p :style="{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 8px' }">
      MCP 工具通过 Model Context Protocol 接入，对话模型可调用已启用服务器的工具；连接失败的服务器不会暴露给用户。
    </p>
    <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }">
      <span :style="{ fontSize: '13px', color: 'var(--text-tertiary)' }">共 {{ servers.length }} 个服务器</span>
      <div :style="{ display: 'flex', gap: '8px' }">
        <el-button size="small" @click="loadServers()" :loading="loading">刷新</el-button>
        <el-button size="small" type="primary" @click="openCreate">新建服务器</el-button>
      </div>
    </div>

    <!-- 服务器表格 -->
    <el-table
      v-loading="loading"
      :data="servers"
      empty-text="暂无 MCP 服务器"
      class="admin-table"
      :style="{ width: '100%' }"
    >
      <el-table-column prop="name" label="名称" min-width="120" show-overflow-tooltip />
      <el-table-column label="传输方式" width="100">
        <template #default="{ row }">
          <el-tag size="small" effect="light">{{ row.transport }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="配置" min-width="220">
        <template #default="{ row }">
          <div
            v-if="row.transport === 'stdio'"
            :title="stdioSummary(row)"
            :style="{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }"
          >{{ stdioSummary(row) }}</div>
          <div
            v-else
            :title="row.url || '-'"
            :style="{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }"
          >{{ row.url || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tooltip v-if="row.status === 'error' && row.statusMessage" :content="row.statusMessage" placement="top">
            <span :style="{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'default' }">
              <span :style="{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor(row.status), flexShrink: 0 }" />
              <span :style="{ color: statusColor(row.status) }">{{ statusText(row.status) }}</span>
            </span>
          </el-tooltip>
          <span v-else :style="{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }">
            <span :style="{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor(row.status), flexShrink: 0 }" />
            <span :style="{ color: 'var(--text-secondary)' }">{{ statusText(row.status) }}</span>
          </span>
        </template>
      </el-table-column>
      <el-table-column label="工具数" width="80">
        <template #default="{ row }">
          <el-tooltip v-if="row.tools?.length" placement="top">
            <template #content>
              <div :style="{ maxHeight: '240px', overflowY: 'auto', lineHeight: '1.6' }">
                <div v-for="tool in row.tools" :key="tool.name">{{ tool.name }}<template v-if="tool.description">：{{ tool.description }}</template></div>
              </div>
            </template>
            <span :style="{ fontSize: '13px', cursor: 'default', borderBottom: '1px dotted var(--border)' }">{{ row.toolCount }}</span>
          </el-tooltip>
          <span v-else :style="{ fontSize: '13px', color: 'var(--text-tertiary)' }">0</span>
        </template>
      </el-table-column>
      <el-table-column label="启用" width="80">
        <template #default="{ row }">
          <el-switch
            :model-value="row.isEnabled"
            @change="(val: string | number | boolean) => toggleEnabled(row, val)"
          />
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="150">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button size="small" link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新建/编辑 对话框 -->
    <el-dialog v-model="dialog" :title="editMode ? '编辑 MCP 服务器' : '新建 MCP 服务器'" width="480px" :close-on-click-modal="false">
      <el-form label-position="top" @submit.prevent="handleSubmit">
        <el-form-item required>
          <template #label>
            <span>名称</span>
            <span :style="{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '6px' }">仅字母、数字、下划线、连字符，1-32 位</span>
          </template>
          <el-input v-model="form.name" placeholder="例如 filesystem" />
        </el-form-item>
        <el-form-item label="传输方式" required>
          <el-radio-group v-model="form.transport">
            <el-radio value="stdio">stdio（本地进程）</el-radio>
            <el-radio value="http">http（远程服务）</el-radio>
          </el-radio-group>
        </el-form-item>
        <template v-if="form.transport === 'stdio'">
          <el-form-item label="命令" required>
            <el-input v-model="form.command" placeholder="例如 node / npx" />
          </el-form-item>
          <el-form-item>
            <template #label>
              <span>参数</span>
              <span :style="{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '6px' }">每行一个参数</span>
            </template>
            <el-input v-model="form.argsText" type="textarea" :rows="3" placeholder="-y&#10;@modelcontextprotocol/server-filesystem&#10;/tmp" />
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="URL" required>
            <el-input v-model="form.url" placeholder="https://example.com/mcp" />
          </el-form-item>
          <el-form-item>
            <template #label>
              <span>请求头</span>
              <span :style="{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '6px' }">每行一个，格式 Key: Value；编辑时未修改则保留原值</span>
            </template>
            <el-input v-model="form.headersText" type="textarea" :rows="3" placeholder="Authorization: Bearer xxx" @input="headersDirty = true" />
          </el-form-item>
        </template>
        <el-form-item label="启用">
          <el-switch v-model="form.isEnabled" />
        </el-form-item>
      </el-form>
      <!-- 测试连接结果：工具列表 -->
      <div v-if="testTools.length > 0" :style="{ padding: '8px 12px', borderRadius: '8px', background: 'var(--input-bg)', fontSize: '12px', color: 'var(--text-secondary)' }">
        <div :style="{ marginBottom: '4px', color: 'var(--text-tertiary)' }">测试发现 {{ testTools.length }} 个工具</div>
        <div :style="{ maxHeight: '120px', overflowY: 'auto', lineHeight: '1.6' }">
          <span v-for="(tool, i) in testTools" :key="tool.name">{{ i > 0 ? '、' : '' }}{{ tool.name }}</span>
        </div>
      </div>
      <template #footer>
        <el-button :loading="testing" @click="handleTest">测试连接</el-button>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
