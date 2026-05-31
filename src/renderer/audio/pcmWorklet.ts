import { SAMPLE_RATE, CHANNELS, FRAME_SIZE } from '@shared/constants'

/**
 * AudioWorkletProcessor code inlined as a template literal.
 * Loaded as a Blob URL to avoid file:// protocol issues in packaged Electron.
 *
 * Accumulates Float32 samples into frames of FRAME_SIZE, converts to
 * Int16 PCM LE, and posts each frame with its AudioContext timestamp.
 */
const WORKLET_CODE = `
class PcmFramerProcessor extends AudioWorkletProcessor {
  constructor(opts) {
    super();
    this.frameSize = opts.processorOptions.frameSize;
    this.buf = new Float32Array(this.frameSize);
    this.idx = 0;
  }

  process(inputs) {
    const ch0 = inputs[0]?.[0];
    if (!ch0) return true;

    for (let i = 0; i < ch0.length; i++) {
      this.buf[this.idx++] = ch0[i];

      if (this.idx === this.frameSize) {
        const pcm = new Int16Array(this.frameSize);
        for (let j = 0; j < this.frameSize; j++) {
          const s = Math.max(-1, Math.min(1, this.buf[j]));
          pcm[j] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        this.port.postMessage(
          { pcm: pcm.buffer, capturedAt: currentTime },
          [pcm.buffer]
        );
        this.idx = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-framer', PcmFramerProcessor);
`

let workletUrl: string | null = null

function getWorkletUrl(): string {
  if (!workletUrl) {
    const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' })
    workletUrl = URL.createObjectURL(blob)
  }
  return workletUrl
}

export interface PcmWorkletHandle {
  node: AudioWorkletNode
  disconnect: () => void
}

/**
 * Creates an AudioContext at 16 kHz, loads the PCM framer worklet,
 * and connects the given source stream.
 *
 * @param stream  MediaStream with audio tracks
 * @param onFrame Called for each PCM frame: (pcm: ArrayBuffer, capturedAtMs: number)
 */
export async function createPcmCapture(
  stream: MediaStream,
  onFrame: (pcm: ArrayBuffer, capturedAtMs: number) => void
): Promise<{ ctx: AudioContext; handle: PcmWorkletHandle }> {
  const ctx = new AudioContext({
    sampleRate: SAMPLE_RATE,
    latencyHint: 'interactive',
  })

  // Chromium resamples the input to match the AudioContext sampleRate
  await ctx.audioWorklet.addModule(getWorkletUrl())

  const source = ctx.createMediaStreamSource(stream)

  const node = new AudioWorkletNode(ctx, 'pcm-framer', {
    processorOptions: { frameSize: FRAME_SIZE },
    numberOfInputs: 1,
    numberOfOutputs: 0,
    channelCount: CHANNELS,
    channelCountMode: 'explicit',
    channelInterpretation: 'discrete',
  })

  // Anchor: ms-epoch offset for converting AudioContext.currentTime → ms epoch
  const epochAnchorMs = Date.now() - ctx.currentTime * 1_000

  node.port.onmessage = (ev: MessageEvent<{ pcm: ArrayBuffer; capturedAt: number }>) => {
    const capturedAtMs = Math.round(epochAnchorMs + ev.data.capturedAt * 1_000)
    onFrame(ev.data.pcm, capturedAtMs)
  }

  source.connect(node)

  const handle: PcmWorkletHandle = {
    node,
    disconnect: () => {
      source.disconnect()
      node.disconnect()
      node.port.close()
      ctx.close()
    },
  }

  return { ctx, handle }
}
