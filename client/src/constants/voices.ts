export interface VoiceOption {
  id: string
  name: string
  language: 'Chinese' | 'English'
  gender: 'Female' | 'Male'
  description: string
}

export const VOICES: VoiceOption[] = [
  { id: 'mimo_default', name: 'MiMo 默认', language: 'Chinese', gender: 'Female', description: '默认音色' },
  { id: '冰糖', name: '冰糖', language: 'Chinese', gender: 'Female', description: '甜美女声' },
  { id: '茉莉', name: '茉莉', language: 'Chinese', gender: 'Female', description: '清雅女声' },
  { id: '苏打', name: '苏打', language: 'Chinese', gender: 'Male', description: '活力男声' },
  { id: '白桦', name: '白桦', language: 'Chinese', gender: 'Male', description: '沉稳男声' },
  { id: 'Mia', name: 'Mia', language: 'English', gender: 'Female', description: 'English female' },
  { id: 'Chloe', name: 'Chloe', language: 'English', gender: 'Female', description: 'English female' },
  { id: 'Milo', name: 'Milo', language: 'English', gender: 'Male', description: 'English male' },
  { id: 'Dean', name: 'Dean', language: 'English', gender: 'Male', description: 'English male' },
]

export const DEFAULT_VOICE = 'mimo_default'
