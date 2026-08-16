<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { AdminService } from '@/services/admin.service'
import { formatDateTime } from './date-format'
import type { Provider, ProviderModel } from '@/types/admin'

type SwitchValue = boolean | string | number

const providers = ref<Provider[]>([])
const loading = ref(false)

async function loadProviders(silent = false) {
  if (!silent) loading.value = true
  try {
    providers.value = await AdminService.getProviders()
  } catch (err: any) {
    if (!silent) ElMessage.error(err.response?.data?.message || '获取供应商列表失败')
  } finally {
    if (!silent) loading.value = false
  }
}

onMounted(() => loadProviders())

// ===== 开关（乐观更新 + 失败回滚 + 静默刷新） =====
async function toggleProvider(row: Provider, field: 'isEnabled' | 'isDefault', value: SwitchValue) {
  const val = Boolean(value)
  const prev = row[field]
  row[field] = val
  try {
    await AdminService.updateProvider(row.id, { [field]: val })
    await loadProviders(true)
  } catch (err: any) {
    row[field] = prev
    ElMessage.error(err.response?.data?.message || '操作失败')
  }
}

async function toggleModel(model: ProviderModel, field: 'isEnabled' | 'isDefault', value: SwitchValue) {
  const val = Boolean(value)
  const prev = model[field]
  model[field] = val
  try {
    await AdminService.updateModel(model.id, { [field]: val })
    await loadProviders(true)
  } catch (err: any) {
    model[field] = prev
    ElMessage.error(err.response?.data?.message || '操作失败')
  }
}

// ===== 供应商 新建 / 编辑 =====
const providerDialog = ref(false)
const providerEditMode = ref(false)
const providerTargetId = ref<string | null>(null)
const providerSaving = ref(false)
const providerForm = reactive({ name: '', baseUrl: '', apiKey: '', isEnabled: true, isDefault: false })

function openProviderCreate() {
  providerEditMode.value = false
  providerTargetId.value = null
  providerForm.name = ''
  providerForm.baseUrl = ''
  providerForm.apiKey = ''
  providerForm.isEnabled = true
  providerForm.isDefault = false
  providerDialog.value = true
}

function openProviderEdit(row: Provider) {
  providerEditMode.value = true
  providerTargetId.value = row.id
  providerForm.name = row.name
  providerForm.baseUrl = row.baseUrl
  providerForm.apiKey = ''
  providerForm.isEnabled = row.isEnabled
  providerForm.isDefault = row.isDefault
  providerDialog.value = true
}

async function handleProviderSubmit() {
  if (!providerForm.name || !providerForm.baseUrl) {
    ElMessage.warning('请填写名称和 Base URL')
    return
  }
  if (!providerEditMode.value && !providerForm.apiKey) {
    ElMessage.warning('请填写 API Key')
    return
  }
  providerSaving.value = true
  try {
    if (providerEditMode.value && providerTargetId.value) {
      const body: { name?: string; baseUrl?: string; apiKey?: string; isEnabled?: boolean; isDefault?: boolean } = {
        name: providerForm.name,
        baseUrl: providerForm.baseUrl,
        isEnabled: providerForm.isEnabled,
        isDefault: providerForm.isDefault,
      }
      if (providerForm.apiKey) body.apiKey = providerForm.apiKey
      await AdminService.updateProvider(providerTargetId.value, body)
      ElMessage.success('供应商已更新')
    } else {
      await AdminService.createProvider({
        name: providerForm.name,
        baseUrl: providerForm.baseUrl,
        apiKey: providerForm.apiKey,
        isEnabled: providerForm.isEnabled,
        isDefault: providerForm.isDefault,
      })
      ElMessage.success('供应商已创建')
    }
    providerDialog.value = false
    await loadProviders()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '保存失败')
  } finally {
    providerSaving.value = false
  }
}

// ===== 供应商 删除 =====
async function handleProviderDelete(row: Provider) {
  try {
    await ElMessageBox.confirm(`确定删除供应商「${row.name}」吗？其下所有模型也会被删除。`, '删除供应商', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await AdminService.deleteProvider(row.id)
    ElMessage.success('已删除供应商')
    if (modelsProviderId.value === row.id) modelsDialog.value = false
    await loadProviders()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '删除失败')
  }
}

// ===== 模型管理 =====
const modelsDialog = ref(false)
const modelsProviderId = ref<string | null>(null)
const modelsProvider = computed(() => providers.value.find(p => p.id === modelsProviderId.value) || null)

function openModels(row: Provider) {
  modelsProviderId.value = row.id
  modelsDialog.value = true
}

// ===== 模型 新建 / 编辑 =====
const modelDialog = ref(false)
const modelEditMode = ref(false)
const modelTargetId = ref<string | null>(null)
const modelSaving = ref(false)
const modelForm = reactive({ providerId: '', modelId: '', displayName: '', type: 'chat', isEnabled: true, isDefault: false })

function openModelCreate() {
  if (!modelsProvider.value) return
  modelEditMode.value = false
  modelTargetId.value = null
  modelForm.providerId = modelsProvider.value.id
  modelForm.modelId = ''
  modelForm.displayName = ''
  modelForm.type = 'chat'
  modelForm.isEnabled = true
  modelForm.isDefault = false
  modelDialog.value = true
}

function openModelEdit(model: ProviderModel) {
  modelEditMode.value = true
  modelTargetId.value = model.id
  modelForm.providerId = modelsProvider.value?.id || ''
  modelForm.modelId = model.modelId
  modelForm.displayName = model.displayName
  modelForm.type = model.type || 'chat'
  modelForm.isEnabled = model.isEnabled
  modelForm.isDefault = model.isDefault
  modelDialog.value = true
}

async function handleModelSubmit() {
  if (!modelForm.providerId) {
    ElMessage.warning('请选择所属供应商')
    return
  }
  if (!modelForm.modelId || !modelForm.displayName) {
    ElMessage.warning('请填写实际模型 ID 和显示名')
    return
  }
  modelSaving.value = true
  try {
    if (modelEditMode.value && modelTargetId.value) {
      await AdminService.updateModel(modelTargetId.value, {
        providerId: modelForm.providerId,
        modelId: modelForm.modelId,
        displayName: modelForm.displayName,
        type: modelForm.type,
        isEnabled: modelForm.isEnabled,
        isDefault: modelForm.isDefault,
      })
      ElMessage.success('模型已更新')
    } else {
      await AdminService.createModel({
        providerId: modelForm.providerId,
        modelId: modelForm.modelId,
        displayName: modelForm.displayName,
        type: modelForm.type,
        isEnabled: modelForm.isEnabled,
        isDefault: modelForm.isDefault,
      })
      ElMessage.success('模型已创建')
    }
    modelDialog.value = false
    modelsProviderId.value = modelForm.providerId
    await loadProviders(true)
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '保存失败')
  } finally {
    modelSaving.value = false
  }
}

// ===== 模型 删除 =====
async function handleModelDelete(model: ProviderModel) {
  try {
    await ElMessageBox.confirm(`确定删除模型「${model.displayName || model.modelId}」吗？`, '删除模型', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await AdminService.deleteModel(model.id)
    ElMessage.success('已删除模型')
    await loadProviders(true)
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '删除失败')
  }
}
</script>

<template>
  <div>
    <!-- 提示 + 顶部操作栏 -->
    <p :style="{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 8px' }">
      对话模型走 OpenAI 兼容协议；TTS/语音识别固定使用 MiMo（.env 配置），不在此管理。
    </p>
    <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }">
      <span :style="{ fontSize: '13px', color: 'var(--text-tertiary)' }">共 {{ providers.length }} 个供应商</span>
      <div :style="{ display: 'flex', gap: '8px' }">
        <el-button size="small" @click="loadProviders()" :loading="loading">刷新</el-button>
        <el-button size="small" type="primary" @click="openProviderCreate">新建供应商</el-button>
      </div>
    </div>

    <!-- 供应商表格 -->
    <el-table
      v-loading="loading"
      :data="providers"
      empty-text="暂无供应商"
      class="admin-table"
      :style="{ width: '100%' }"
    >
      <el-table-column prop="name" label="名称" min-width="120" show-overflow-tooltip />
      <el-table-column prop="baseUrl" label="Base URL" min-width="200" show-overflow-tooltip />
      <el-table-column label="API Key" width="130">
        <template #default="{ row }">{{ row.apiKeyMasked || '-' }}</template>
      </el-table-column>
      <el-table-column label="启用" width="80">
        <template #default="{ row }">
          <el-switch
            :model-value="row.isEnabled"
            @change="(val: string | number | boolean) => toggleProvider(row, 'isEnabled', val)"
          />
        </template>
      </el-table-column>
      <el-table-column label="默认" width="80">
        <template #default="{ row }">
          <el-switch
            :model-value="row.isDefault"
            @change="(val: string | number | boolean) => toggleProvider(row, 'isDefault', val)"
          />
        </template>
      </el-table-column>
      <el-table-column label="模型数" width="80">
        <template #default="{ row }">{{ row.models?.length ?? 0 }}</template>
      </el-table-column>
      <el-table-column label="创建时间" width="150">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" link type="primary" @click="openModels(row)">模型管理</el-button>
          <el-button size="small" link type="primary" @click="openProviderEdit(row)">编辑</el-button>
          <el-button size="small" link type="danger" @click="handleProviderDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 供应商 新建/编辑 对话框 -->
    <el-dialog v-model="providerDialog" :title="providerEditMode ? '编辑供应商' : '新建供应商'" width="448px" :close-on-click-modal="false">
      <el-form label-position="top" @submit.prevent="handleProviderSubmit">
        <el-form-item label="名称" required>
          <el-input v-model="providerForm.name" placeholder="例如 MiMo / OpenRouter" />
        </el-form-item>
        <el-form-item label="Base URL" required>
          <el-input v-model="providerForm.baseUrl" placeholder="https://api.example.com/v1" />
        </el-form-item>
        <el-form-item :required="!providerEditMode">
          <template #label>
            <span>API Key</span>
            <span v-if="providerEditMode" :style="{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '6px' }">留空则不修改</span>
          </template>
          <el-input v-model="providerForm.apiKey" type="password" :placeholder="providerEditMode ? '留空则不修改' : 'API Key'" show-password />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="providerForm.isEnabled" />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="providerForm.isDefault" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="providerDialog = false">取消</el-button>
        <el-button type="primary" :loading="providerSaving" @click="handleProviderSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 模型管理对话框 -->
    <el-dialog v-model="modelsDialog" :title="`模型管理 - ${modelsProvider?.name || ''}`" width="860px" :close-on-click-modal="false">
      <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }">
        <span :style="{ fontSize: '13px', color: 'var(--text-tertiary)' }">共 {{ modelsProvider?.models?.length ?? 0 }} 个模型</span>
        <el-button size="small" type="primary" @click="openModelCreate">新增模型</el-button>
      </div>
      <el-table
        :data="modelsProvider?.models || []"
        empty-text="暂无模型"
        class="admin-table"
        :style="{ width: '100%' }"
      >
        <el-table-column prop="modelId" label="模型 ID" min-width="200" show-overflow-tooltip />
        <el-table-column prop="displayName" label="显示名" min-width="140" show-overflow-tooltip />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag size="small" effect="light">{{ row.type || 'chat' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="启用" width="80">
          <template #default="{ row }">
            <el-switch
              :model-value="row.isEnabled"
              @change="(val: string | number | boolean) => toggleModel(row, 'isEnabled', val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="默认" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.isDefault" size="small" type="success" effect="light">默认</el-tag>
            <span v-else :style="{ fontSize: '13px', color: 'var(--text-tertiary)' }">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="openModelEdit(row)">编辑</el-button>
            <el-button size="small" link type="danger" @click="handleModelDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 模型 新建/编辑 对话框 -->
    <el-dialog v-model="modelDialog" :title="modelEditMode ? '编辑模型' : '新增模型'" width="448px" :close-on-click-modal="false">
      <el-form label-position="top" @submit.prevent="handleModelSubmit">
        <el-form-item label="所属供应商" required>
          <el-select v-model="modelForm.providerId" :style="{ width: '100%' }" placeholder="选择供应商">
            <el-option v-for="p in providers" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="实际模型 ID" required>
          <el-input v-model="modelForm.modelId" placeholder="例如 mimo-v2.5-flash" />
        </el-form-item>
        <el-form-item label="显示名" required>
          <el-input v-model="modelForm.displayName" placeholder="例如 MiMo Flash" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="modelForm.type" :style="{ width: '100%' }">
            <el-option label="对话 (chat)" value="chat" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="modelForm.isEnabled" />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="modelForm.isDefault" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="modelDialog = false">取消</el-button>
        <el-button type="primary" :loading="modelSaving" @click="handleModelSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
