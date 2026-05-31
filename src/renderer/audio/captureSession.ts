import type { AudioSource, AudioChunkIpc } from '@shared/types'
import { getMicrophoneStream } from './micCapture'
import { getSystemAudioStream } from './systemCapture'
import { createPcmCapture, type PcmWorkletHandle } from './pcmWorklet'

export type LevelCallback = (source: AudioSource, rmsLevel: number) => void

/** RMS of a PCM Int16 buffer, normalized to 0–1 */
function computeRms(pcm: ArrayBuffer): number {
  const view = new Int16Array(pcm)
  if (view.length === 0) return 0
  let sumSq = 0
  for (let i = 0; i < view.length; i++) {
    const n = view[i] / 32_768
    sumSq += n * n
  }
  return Math.sqrt(sumSq / view.length)
}

export class CaptureSession {
  readonly sessionId: string

  private micStream: MediaStream | null = null
  private sysStream: MediaStream | null = null
  private micHandle: PcmWorkletHandle | null = null
  private sysHandle: PcmWorkletHandle | null = null
  private running = false

  constructor(
    private readonly micDeviceId: string | undefined,
    private readonly onChunk: (chunk: AudioChunkIpc) => void,
    private readonly onLevel: LevelCallback
  ) {
    this.sessionId = crypto.randomUUID()
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true

    const makeHandler =
      (source: AudioSource) =>
      (pcm: ArrayBuffer, timestamp: number): void => {
        // Compute level from the same buffer before it's transferred
        const level = computeRms(pcm)
        this.onLevel(source, level)

        const chunk: AudioChunkIpc = {
          sessionId: this.sessionId,
          source,
          timestamp,
          pcm,
        }
        this.onChunk(chunk)
      }

    // Start mic and system captures in parallel
    await Promise.all([
      this.startMic(makeHandler('microphone')),
      this.startSystem(makeHandler('system')),
    ])
  }

  private async startMic(
    onFrame: (pcm: ArrayBuffer, timestamp: number) => void
  ): Promise<void> {
    try {
      this.micStream = await getMicrophoneStream(this.micDeviceId)
      const { handle } = await createPcmCapture(this.micStream, onFrame)
      this.micHandle = handle
    } catch (err) {
      this.running = false
      throw new Error(`Microphone capture failed: ${String(err)}`)
    }
  }

  private async startSystem(
    onFrame: (pcm: ArrayBuffer, timestamp: number) => void
  ): Promise<void> {
    try {
      this.sysStream = await getSystemAudioStream()
      const { handle } = await createPcmCapture(this.sysStream, onFrame)
      this.sysHandle = handle
    } catch (err) {
      // System audio is best-effort — log and continue with mic only
      console.warn('System audio capture failed (continuing mic only):', err)
      this.sysStream = null
    }
  }

  stop(): void {
    if (!this.running) return
    this.running = false

    this.micHandle?.disconnect()
    this.sysHandle?.disconnect()
    this.micHandle = null
    this.sysHandle = null

    this.micStream?.getTracks().forEach((t) => t.stop())
    this.sysStream?.getTracks().forEach((t) => t.stop())
    this.micStream = null
    this.sysStream = null
  }

  isRunning(): boolean {
    return this.running
  }
}
