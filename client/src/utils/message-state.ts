import type { MessagePhase, MessageState } from '@/types/chat'

export function createMessageState(): MessageState {
  return {
    phase: 'idle',
    thinkingContent: '',
    answerContent: '',
    activeTools: new Map(),
  }
}

export function transitionPhase(state: MessageState, phase: MessagePhase): MessageState {
  return { ...state, phase }
}

export function appendThinking(state: MessageState, content: string): MessageState {
  return { ...state, thinkingContent: state.thinkingContent + content }
}

export function appendAnswer(state: MessageState, content: string): MessageState {
  return { ...state, answerContent: state.answerContent + content }
}
