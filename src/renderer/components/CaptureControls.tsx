import { useState, useEffect, useRef } from 'react'
import { useCaptureStore } from '../store/captureStore'
import { CaptureSession } from '../audio/captureSession'
import { pushChunk, startCapture, stopCapture } from '../lib/ipc'
import type { AudioChunkIpc, AudioSource } from '@shared/types'

let activeSession: CaptureSession | null = null

// ---------------------------------------------------------------------------
// Waveform canvas — reads real AnalyserNode data via ref each frame
// ---------------------------------------------------------------------------
function WaveformCanvas({ analyserRef, active }: {
  analyserRef: React.MutableRefObject<AnalyserNode | null>
  active: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const BAR_COUNT = 26
    const BAR_W = 3
    const GAP = 2

    function drawBars(values: number[]) {
      if (!ctx || !canvas) return
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      const totalW = BAR_COUNT * (BAR_W + GAP) - GAP
      const startX = (width - totalW) / 2
      const mid = height / 2

      for (let i = 0; i < BAR_COUNT; i++) {
        const amp = values[i] ?? 0  // 0..1
        const barH = Math.max(2, amp * height * 0.88)
        const alpha = 0.35 + 0.65 * amp
        ctx.fillStyle = `rgba(99, 102, 241, ${alpha})`
        ctx.fillRect(startX + i * (BAR_W + GAP), mid - barH / 2, BAR_W, barH)
      }
    }

    if (!active) {
      // Draw flat idle bars
      drawBars(new Array(BAR_COUNT).fill(0.04))
      return
    }

    let rafId: number

    function loop() {
      const analyser = analyserRef.current
      if (!analyser) {
        drawBars(new Array(BAR_COUNT).fill(0.04))
        rafId = requestAnimationFrame(loop)
        return
      }

      // Use frequency data — much more responsive to normal speech levels
      // Only use lower bins (voice range ~80Hz–3kHz out of 0–8kHz)
      const bufLen = analyser.frequencyBinCount  // fftSize / 2 = 128
      const data = new Uint8Array(bufLen)
      analyser.getByteFrequencyData(data)

      // Use roughly the first 60% of bins (voice frequencies)
      const usableBins = Math.floor(bufLen * 0.6)
      const step = Math.max(1, Math.floor(usableBins / BAR_COUNT))
      const values = Array.from({ length: BAR_COUNT }, (_, i) => {
        const raw = data[i * step] ?? 0  // 0–255, 0 = silence
        // Apply slight gain to make normal speech clearly visible
        return Math.min(1, (raw / 255) * 2.2)
      })

      drawBars(values)
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [active, analyserRef])

  return (
    <canvas
      ref={canvasRef}
      width={110}
      height={28}
      style={{ display: 'block', flexShrink: 0 }}
    />
  )
}

// ---------------------------------------------------------------------------
// Elapsed timer
// ---------------------------------------------------------------------------
function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => clearInterval(id)
  }, [startedAt])
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0')
  const s = (elapsed % 60).toString().padStart(2, '0')
  return <span style={cStyles.timer}>{h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`}</span>
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function CaptureControls() {
  const isCapturing = useCaptureStore((s) => s.isCapturing)
  const setCapturing = useCaptureStore((s) => s.setCapturing)
  const setError = useCaptureStore((s) => s.setError)
  const setMicLevel = useCaptureStore((s) => s.setMicLevel)
  const setSysLevel = useCaptureStore((s) => s.setSysLevel)
  const selectedMicId = useCaptureStore((s) => s.selectedMicId)
  const [loading, setLoading] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)

  // Analyser lives in a ref — no React re-render needed when it changes
  const analyserRef = useRef<AnalyserNode | null>(null)

  async function handleStart() {
    if (loading || isCapturing) return
    setLoading(true)
    setError(null)
    try {
      const onChunk = (chunk: AudioChunkIpc) => pushChunk(chunk)
      const onLevel = (source: AudioSource, level: number) => {
        if (source === 'microphone') setMicLevel(level)
        else setSysLevel(level)
      }
      const session = new CaptureSession(selectedMicId, onChunk, onLevel)
      await session.start()
      const result = await startCapture({ sessionId: session.sessionId })
      if (!result.success) throw new Error(result.error ?? 'startCapture failed')
      activeSession = session
      analyserRef.current = session.getMicAnalyser()   // stored in ref, not state
      setStartedAt(Date.now())
      setCapturing(true, session.sessionId)
    } catch (err) {
      setError(String(err))
      activeSession?.stop()
      activeSession = null
    } finally {
      setLoading(false)
    }
  }

  async function handleStop() {
    if (loading || !isCapturing) return
    setLoading(true)
    try {
      activeSession?.stop()
      activeSession = null
      analyserRef.current = null
      await stopCapture()
      setCapturing(false)
      setMicLevel(0)
      setSysLevel(0)
      setStartedAt(null)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={cStyles.row}>
      {/* Circular action button */}
      <button
        style={{ ...cStyles.circleBtn, opacity: loading ? 0.6 : 1 }}
        onClick={isCapturing ? handleStop : handleStart}
        disabled={loading}
        title={isCapturing ? 'Stop capture' : 'Start capture'}
      >
        {isCapturing
          ? <span style={cStyles.stopIcon} />
          : <span style={cStyles.playIcon} />
        }
      </button>

      {/* Labels */}
      <div style={cStyles.info}>
        <span style={cStyles.mainLabel}>
          {isCapturing ? 'Capturing…' : loading ? 'Starting…' : 'Start capture'}
        </span>
        {isCapturing && startedAt
          ? <ElapsedTimer startedAt={startedAt} />
          : <span style={cStyles.subLabel}>Click to begin</span>
        }
      </div>

      {/* Waveform — always rendered, reads analyserRef each frame */}
      <WaveformCanvas analyserRef={analyserRef} active={isCapturing} />
    </div>
  )
}

const cStyles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '4px 2px',
  },
  circleBtn: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    border: '2px solid #6366f1',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    padding: 0,
    transition: 'opacity 0.15s',
  },
  stopIcon: {
    display: 'block',
    width: '18px',
    height: '18px',
    background: '#6366f1',
    borderRadius: '3px',
  },
  playIcon: {
    display: 'block',
    width: 0,
    height: 0,
    borderTop: '9px solid transparent',
    borderBottom: '9px solid transparent',
    borderLeft: '16px solid #6366f1',
    marginLeft: '3px',
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    flex: 1,
  },
  mainLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  subLabel: {
    fontSize: '11px',
    color: '#475569',
  },
  timer: {
    fontSize: '13px',
    color: '#64748b',
    fontFamily: 'monospace',
    fontVariantNumeric: 'tabular-nums',
  },
}
