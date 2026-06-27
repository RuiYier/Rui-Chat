import type { MessagePhase, MessageState } from '@/types/chat'

/**
 * 创建消息状态对象
 * 用于管理单条消息的生命周期状态
 * @returns 初始化的消息状态
 */
export function createMessageState(): MessageState {
  return {
    phase: 'idle',           // 当前阶段：idle/thinking/answering/tool_calling/error
    thinkingContent: '',     // 思考过程内容
    answerContent: '',       // 回答内容
    activeTools: new Map(),  // 活跃的工具调用
  }
}

/**
 * 转换消息阶段
 * @param state 当前状态
 * @param phase 目标阶段
 * @returns 更新后的状态
 */
export function transitionPhase(state: MessageState, phase: MessagePhase): MessageState {
  return { ...state, phase }
}

/**
 * 追加思考内容
 * @param state 当前状态
 * @param content 新的思考内容
 * @returns 更新后的状态
 */
export function appendThinking(state: MessageState, content: string): MessageState {
  return { ...state, thinkingContent: state.thinkingContent + content }
}

/**
 * 追加回答内容
 * @param state 当前状态
 * @param content 新的回答内容
 * @returns 更新后的状态
 */
export function appendAnswer(state: MessageState, content: string): MessageState {
  return { ...state, answerContent: state.answerContent + content }
}
