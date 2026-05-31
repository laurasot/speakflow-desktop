import { useState } from 'react'
import { useCaptureStore } from '../store/captureStore'
import { CaptureSession } from '../audio/captureSession'
import { pushChunk, startCapture, stopCapture } from '../lib/ipc'
import type { AudioChunkIpc, AudioSource } from '@shared/types'

let activeSession: CaptureSession | null = null

export function CaptureControls() {
  const isCapturing = useCaptureStore((s) => s.isCapturing)
  const setCapturing = useCaptureStore((s) => s.setCapturing)
  const setError = useCaptureStore((s) => s.setError)
  const setMicLevel = useCaptureStore((s) => s.setMicLevel)
  const setSysLevel = useCaptureStore((s) => s.setSysLevel)
  const selectedMicId = useCaptureStore((s) => s.selectedMicId)
  const sessionId = useCaptureStore((s) => s.sessionId)
  const [loading, setLoading] = useState(false)

  async function handleStart() {
    if (loading || isCapturing) return
    setLoading(true)
    setError(null)

    try {
      const onChunk = (chunk: AudioChunkIpc) => {
        pushChunk(chunk)
      }

      const onLevel = (source: AudioSource, level: number) => {
        if (source === 'microphone') setMicLevel(level)
        else setSysLevel(level)
      }

      const session = new CaptureSession(selectedMicId, onChunk, onLevel)
      await session.start()

      const result = await startCapture({ sessionId: session.sessionId })
      if (!result.success) throw new Error(result.error ?? 'startCapture failed')

      activeSession = session
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
      await stopCapture()
      setCapturing(false)
      setMicLevel(0)
      setSysLevel(0)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      {isCapturing ? (
        <div style={styles.activeRow}>
          <div style={styles.pulseWrap}>
            <span style={styles.pulseDot} />
          </div>
          <div style={styles.activeInfo}>
            <span style={styles.activeLabel}>Capturing</span>
            {sessionId && (
              <span style={styles.sessionId}>
                {sessionId.slice(0, 8)}…
              </span>
            )}
          </div>
          <button
            style={{ ...styles.btn, ...styles.btnStop }}
            onClick={handleStop}
            disabled={loading}
          >
            {loading ? 'Stopping…' : 'Stop'}
          </button>
        </div>
      ) : (
        <button
          style={{
            ...styles.btn,
            ...styles.btnStart,
            opacity: loading ? 0.6 : 1,
          }}
          onClick={handleStart}
          disabled={loading}
        >
          {loading ? 'Starting…' : '▶  Start Capture'}
        </button>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
  },
  btn: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  btnStart: {
    background: '#6366f1',
    color: '#fff',
    width: '100%',
    padding: '14px',
    fontSize: '15px',
  },
  btnStop: {
    background: '#dc2626',
    color: '#fff',
    marginLeft: 'auto',
    flexShrink: 0,
  },
  activeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    background: '#0f2318',
    borderRadius: '10px',
    padding: '12px 14px',
    border: '1px solid #166534',
  },
  pulseWrap: {
    position: 'relative',
    width: '12px',
    height: '12px',
    flexShrink: 0,
  },
  pulseDot: {
    display: 'block',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#22c55e',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  activeInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  activeLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#4ade80',
  },
  sessionId: {
    fontSize: '11px',
    color: '#6b7280',
    fontFamily: 'monospace',
  },
}
