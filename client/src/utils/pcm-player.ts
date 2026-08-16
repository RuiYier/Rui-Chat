/**
 * PCM16 (小端, 单声道) 流式播放器
 * 通过 Web Audio 将分块到达的 PCM 数据无间隙地排队播放
 */
export class PCMPlayer {
  /** 播放队列全部结束（或输入结束且无待播数据）后触发 */
  onEnded: (() => void) | null = null

  private readonly sampleRate: number
  private ctx: AudioContext | null = null
  private sources = new Set<AudioBufferSourceNode>()
  private lastSource: AudioBufferSourceNode | null = null
  private leftover = new Uint8Array(0)
  private nextStartTime = 0
  private inputEnded = false
  private stopped = false

  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate
  }

  private ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const Ctor: typeof AudioContext =
        window.AudioContext || (window as any).webkitAudioContext
      this.ctx = new Ctor({ sampleRate: this.sampleRate })
    }
    // 用户手势存在时恢复被暂停的上下文
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  /**
   * 追加一块 PCM16 LE 数据，立即排队播放
   * 奇数长度的分块边界字节会缓存到下一块，不会丢失采样
   */
  append(bytes: Uint8Array): void {
    if (this.stopped || bytes.length === 0) return

    // 拼接上一次剩余的字节
    let all: Uint8Array
    if (this.leftover.length > 0) {
      all = new Uint8Array(this.leftover.length + bytes.length)
      all.set(this.leftover)
      all.set(bytes, this.leftover.length)
    } else {
      all = bytes
    }

    const usable = all.length - (all.length % 2)
    this.leftover = all.slice(usable)
    if (usable === 0) return

    const ctx = this.ensureContext()
    const sampleCount = usable / 2
    const floats = new Float32Array(sampleCount)
    const view = new DataView(all.buffer, all.byteOffset, usable)
    for (let i = 0; i < sampleCount; i++) {
      floats[i] = view.getInt16(i * 2, true) / 32768
    }

    const audioBuffer = ctx.createBuffer(1, sampleCount, this.sampleRate)
    audioBuffer.copyToChannel(floats, 0)

    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)
    source.onended = () => {
      this.sources.delete(source)
      if (
        source === this.lastSource &&
        this.inputEnded &&
        this.sources.size === 0 &&
        !this.stopped
      ) {
        this.finish()
      }
    }
    this.sources.add(source)
    this.lastSource = source

    // 无间隙排队: 从当前播放位置或队列末尾开始
    const startAt = Math.max(ctx.currentTime, this.nextStartTime)
    source.start(startAt)
    this.nextStartTime = startAt + audioBuffer.duration
  }

  /** 停止所有播放并重置队列（上下文随之关闭, 实例可被丢弃） */
  stop(): void {
    this.stopped = true
    for (const source of this.sources) {
      try {
        source.onended = null
        source.stop()
      } catch {}
    }
    this.sources.clear()
    this.lastSource = null
    this.leftover = new Uint8Array(0)
    this.nextStartTime = 0
    this.closeContext()
  }

  /** 标记输入结束, 待已排队数据播放完毕后触发 onEnded */
  end(): void {
    if (this.stopped) return
    this.inputEnded = true
    if (this.sources.size === 0) {
      this.finish()
    }
  }

  private finish(): void {
    if (this.stopped) return
    this.stopped = true
    this.onEnded?.()
    this.closeContext()
  }

  private closeContext(): void {
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close().catch(() => {})
    }
    this.ctx = null
  }
}
