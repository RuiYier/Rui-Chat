export interface UserFeatures {
  voiceInput: boolean
  webSearch: boolean
  tts: boolean
}

export interface User {
  id: string
  username: string
  email?: string | null
  name?: string | null
  image?: string | null
  role?: string
  features?: Partial<UserFeatures>
  createdAt?: string
}
