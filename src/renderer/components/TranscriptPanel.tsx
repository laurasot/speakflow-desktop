import { useRef, useEffect } from 'react'
import { useCaptureStore } from '../store/captureStore'

export function TranscriptPanel() {
  const currentTranscripts = useCaptureStore((s) => s.currentTranscripts)
  const finalTranscripts = useCaptureStore((s) => s.finalTranscripts)
  const clearTranscripts = useCaptureStore((s) => s.clearTranscripts)
  const isCapturing = useCaptureStore((s) => s.isCapturing)
  const bottomRef = useRef<HTMLDivElement>(null)

  const currentArray = Array.from(currentTranscripts.values())
  const hasAny = finalTranscripts.length > 0 || currentArray.length > 0

  // Auto-scroll to bottom on new transcripts
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [finalTranscripts.length, currentArray.length])

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>Live transcription</span>
        {hasAny && (
          <button style={styles.clearBtn} onClick={clearTranscripts}>
            Clear
          </button>
        )}
      </div>

      {/* Transcript list */}
      <div style={styles.list}>
        {!hasAny && isCapturing && (
          <p style={styles.placeholder}>Listening…</p>
        )}
        {!hasAny && !isCapturing && (
          <p style={styles.placeholder}>Start capturing to see live transcription</p>
        )}

        {/* Final transcripts */}
        {finalTranscripts.map((t, idx) => {
          const isLast = idx === finalTranscripts.length - 1 && currentArray.length === 0
          return (
            <TranscriptRow key={`final-${idx}`} text={t.text} timestamp={t.timestamp} highlight={isLast} />
          )
        })}

        {/* Current partials */}
        {currentArray.map((t) => (
          <TranscriptRow
            key={`${t.session_id}-${t.source}`}
            text={t.text}
            timestamp={t.timestamp}
            partial
          />
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function TranscriptRow({
  text,
  timestamp,
  partial,
  highlight,
}: {
  text: string
  timestamp?: number
  partial?: boolean
  highlight?: boolean
}) {
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : ''

  return (
    <div style={{ ...styles.row, opacity: partial ? 0.55 : 1 }}>
      <span style={styles.ts}>{time}</span>
      <span
        style={{
          ...styles.text,
          ...(highlight ? styles.textHighlight : {}),
          ...(partial ? styles.textPartial : {}),
        }}
      >
        {text}
      </span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    flexShrink: 0,
  },
  title: {
    fontSize: '11px',
    color: '#475569',
    fontWeight: 500,
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: '#6366f1',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 0 8px',
  },
  placeholder: {
    margin: 0,
    padding: '16px 12px',
    fontSize: '12px',
    color: '#334155',
    fontStyle: 'italic',
  },
  row: {
    display: 'flex',
    gap: '12px',
    padding: '5px 12px',
    alignItems: 'flex-start',
    transition: 'opacity 0.2s',
  },
  ts: {
    fontSize: '11px',
    color: '#334155',
    fontFamily: 'monospace',
    fontVariantNumeric: 'tabular-nums',
    flexShrink: 0,
    paddingTop: '2px',
  },
  text: {
    fontSize: '13px',
    lineHeight: 1.5,
    color: '#94a3b8',
    flex: 1,
    wordBreak: 'break-word',
  },
  textHighlight: {
    color: '#818cf8',
    fontWeight: 500,
  },
  textPartial: {
    color: '#475569',
  },
}
