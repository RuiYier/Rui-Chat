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
    description: '旗舰推理模型，支持深度思考',
    category: 'reasoning',
    supportsThinking: true,
    maxTokens: 8192,
  },
  {
    id: 'mimo-v2.5',
    name: 'MiMo-V2.5',
    description: '通用对话模型，快速响应',
    category: 'chat',
    supportsThinking: false,
    maxTokens: 8192,
  },
]

export const DEFAULT_MODEL = 'mimo-v2.5-pro'
