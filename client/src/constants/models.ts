export interface ModelOption {
  id: string
  name: string
  description: string
  category: 'chat' | 'reasoning'
  supportsThinking: boolean
  maxTokens: number
}

export const MODELS: ModelOption[] = [
  {
    id: 'mimo-v2.5-pro',
    name: 'MiMo-V2.5-Pro',
    description: '参数为 1.02T 的旗舰推理模型',
    category: 'reasoning',
    supportsThinking: true,
    maxTokens: 8192,
  },
  {
    id: 'mimo-v2.5',
    name: 'MiMo-V2.5',
    description: '具备多模态能力的通用对话模型',
    category: 'chat',
    supportsThinking: false,
    maxTokens: 8192,
  },
]

export const DEFAULT_MODEL = 'mimo-v2.5-pro'
