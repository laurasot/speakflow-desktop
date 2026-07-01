import { useCaptureStore } from '../store/captureStore'
import type { SuggestionMessage } from '@shared/types'

export function SuggestionPanel() {
  const suggestions = useCaptureStore((s) => s.suggestions)
  const clearSuggestions = useCaptureStore((s) => s.clearSuggestions)

  if (suggestions.length === 0) return null

  // Show the most recent suggestions as cards (newest last in store)
  const visible = suggestions.slice(-3)

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>
          <span style={styles.sparkle}>✦</span>
          Suggested replies
        </span>
        <button style={styles.clearBtn} onClick={clearSuggestions}>
          Clear
        </button>
      </div>

      <div style={styles.list}>
        {visible.map((item, idx) => (
          <SuggestionCard key={`${item.timestamp}-${idx}`} item={item} />
        ))}
      </div>
    </div>
  )
}

function SuggestionCard({ item }: { item: SuggestionMessage }) {
  async function handleUse() {
    try {
      await navigator.clipboard.writeText(item.suggestion)
    } catch {
      // Clipboard may be unavailable in some Electron contexts
    }
  }

  const title = item.based_on
    ? `Based on: "${item.based_on}"`
    : undefined

  return (
    <button
      type="button"
      style={styles.card}
      onClick={handleUse}
      title={title}
    >
      <span style={styles.cardText}>{item.suggestion}</span>
      <span style={styles.chevron}>›</span>
    </button>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    flexShrink: 0,
    borderTop: '1px solid #1a2234',
    background: '#0c0f14',
    maxHeight: '42%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px 6px',
    flexShrink: 0,
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#818cf8',
    fontWeight: 600,
  },
  sparkle: {
    fontSize: '11px',
    color: '#a5b4fc',
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
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '4px 12px 12px',
    overflowY: 'auto',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 12px',
    background: '#131820',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.15s, background 0.15s',
  },
  cardText: {
    flex: 1,
    fontSize: '13px',
    lineHeight: 1.45,
    color: '#e2e8f0',
    wordBreak: 'break-word',
  },
  chevron: {
    flexShrink: 0,
    fontSize: '18px',
    color: '#475569',
    lineHeight: 1,
  },
}
