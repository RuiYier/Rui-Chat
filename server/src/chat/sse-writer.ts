import { Response } from 'express'

export class SSEWriter {
  constructor(private res: Response) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
  }

  sendThinking(content: string) {
    this.send({ type: 'thinking', content })
  }

  sendAnswer(content: string) {
    this.send({ type: 'answer', content })
  }

  sendToolCall(id: string, name: string, arguments_: string) {
    this.send({ type: 'tool_call', id, name, arguments: arguments_ })
  }

  sendToolProgress(id: string, progress: number, message: string) {
    this.send({ type: 'tool_progress', id, progress, message })
  }

  sendToolResult(id: string, result: string) {
    this.send({ type: 'tool_result', id, result })
  }

  sendComplete(messageId: string, conversationId?: string) {
    this.send({ type: 'complete', messageId, conversationId })
  }

  error(message: string) {
    this.send({ type: 'error', message })
    this.close()
  }

  close() {
    this.res.write('data: [DONE]\n\n')
    this.res.end()
  }

  private send(data: any) {
    this.res.write(`data: ${JSON.stringify(data)}\n\n`)
  }
}
