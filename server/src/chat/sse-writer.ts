import { Response } from 'express'

/**
 * SSE 流式写入器
 * 负责向客户端发送 Server-Sent Events 格式的数据
 */
export class SSEWriter {
  constructor(private res: Response) {
    // 设置 SSE 响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
  }

  /**
   * 发送思考过程内容
   * @param content 思考过程的文本片段
   */
  sendThinking(content: string) {
    this.send({ type: 'thinking', content })
  }

  /**
   * 发送回答内容
   * @param content 回答的文本片段
   */
  sendAnswer(content: string) {
    this.send({ type: 'answer', content })
  }

  /**
   * 发送工具调用信息
   * @param id 工具调用 ID
   * @param name 工具名称
   * @param arguments_ 工具参数（JSON 字符串片段）
   */
  sendToolCall(id: string, name: string, arguments_: string) {
    this.send({ type: 'tool_call', id, name, arguments: arguments_ })
  }

  /**
   * 发送工具执行进度
   * @param id 工具调用 ID
   * @param progress 进度百分比
   * @param message 进度描述信息
   */
  sendToolProgress(id: string, progress: number, message: string) {
    this.send({ type: 'tool_progress', id, progress, message })
  }

  /**
   * 发送工具执行结果
   * @param id 工具调用 ID
   * @param result 工具执行结果
   */
  sendToolResult(id: string, result: string) {
    this.send({ type: 'tool_result', id, result })
  }

  /**
   * 发送流完成信号
   * @param messageId 助手消息 ID
   * @param conversationId 会话 ID（新会话时返回）
   */
  sendComplete(messageId: string, conversationId?: string) {
    this.send({ type: 'complete', messageId, conversationId })
  }

  /**
   * 发送错误信息并关闭连接
   * @param message 错误描述
   */
  error(message: string) {
    this.send({ type: 'error', message })
    this.close()
  }

  /**
   * 关闭 SSE 连接
   */
  close() {
    this.res.write('data: [DONE]\n\n')
    this.res.end()
  }

  /**
   * 发送 SSE 数据
   * @param data 要发送的数据对象
   */
  private send(data: any) {
    this.res.write(`data: ${JSON.stringify(data)}\n\n`)
  }
}
