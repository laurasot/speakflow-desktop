import { useCaptureStore } from '../store/captureStore'

export function TranscriptPanel() {
  const transcripts = useCaptureStore((s) => s.transcripts)
  const isCapturing = useCaptureStore((s) => s.isCapturing)

  if (!isCapturing && transcripts.length === 0) {
    return null
  }

  return (
    <div style={styles.panel}>
      <h3 style={styles.title}>Transcripts</h3>
      <div style={styles.list}>
        {transcripts.length === 0 ? (
          <p style={styles.empty}>Waiting for transcription...</p>
        ) : (
          transcripts.map((t, idx) => (
            <div key={idx} style={styles.item}>
              <div style={styles.header}>
                <span
                  style={{
                    ...styles.badge,
                    background: t.source === 'microphone' ? '#1e3a5f' : '#1e2a3f',
                    color: t.source === 'microphone' ? '#93c5fd' : '#a5b4fc',
                  }}
                >
                  {t.source === 'microphone' ? 'MIC' : 'SYS'}
                </span>
                {t.is_final && <span style={styles.finalBadge}>FINAL</span>}
              </div>
              <p style={styles.text}>{t.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    background: '#0a0d12',
    borderRadius: '8px',
    border: '1px solid #1e293b',
  },
  title: {
    margin: 0,
    fontSize: '13px',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  empty: {
    margin: 0,
    fontSize: '13px',
    color: '#64748b',
    fontStyle: 'italic',
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '8px 10px',
    background: '#141922',
    borderRadius: '6px',
    border: '1px solid #1e2937',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  badge: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
    letterSpacing: '0.05em',
  },
  finalBadge: {
    fontSize: '9px',
    fontWeight: 600,
    padding: '2px 5px',
    borderRadius: '3px',
    background: '#15803d',
    color: '#86efac',
    letterSpacing: '0.05em',
  },
  text: {
    margin: 0,
    fontSize: '13px',
    lineHeight: 1.5,
    color: '#e2e8f0',
  },
}
