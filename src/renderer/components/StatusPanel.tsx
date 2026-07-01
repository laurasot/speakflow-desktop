import { useCaptureStore } from '../store/captureStore'
import type { ConnectionStatus } from '@shared/types'

function VuMeter({ level, label }: { level: number; label: string }) {
  const pct = Math.min(100, Math.round(level * 100 * 4)) // scale up for visibility
  const color =
    pct > 75 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#22c55e'

  return (
    <div style={styles.vu}>
      <span style={styles.vuLabel}>{label}</span>
      <div style={styles.vuTrack}>
        <div
          style={{
            ...styles.vuFill,
            width: `${pct}%`,
            background: color,
            transition: 'width 80ms ease-out, background 200ms ease',
          }}
        />
      </div>
    </div>
  )
}

const statusColor: Record<ConnectionStatus, string> = {
  disconnected: '#64748b',
  connecting: '#f59e0b',
  connected: '#22c55e',
  error: '#ef4444',
}

const statusLabel: Record<ConnectionStatus, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting…',
  connected: 'Connected',
  error: 'Error',
}

export function StatusPanel() {
  const wsStatus = useCaptureStore((s) => s.wsStatus)
  const droppedChunks = useCaptureStore((s) => s.droppedChunks)
  const queueLength = useCaptureStore((s) => s.queueLength)
  const micLevel = useCaptureStore((s) => s.micLevel)
  const sysLevel = useCaptureStore((s) => s.sysLevel)
  const isCapturing = useCaptureStore((s) => s.isCapturing)

  return (
    <div style={styles.panel}>
      {/* WS status row */}
      <div style={styles.statusRow}>
        <div
          style={{
            ...styles.dot,
            background: statusColor[wsStatus],
            boxShadow: wsStatus === 'connected' ? `0 0 4px ${statusColor[wsStatus]}` : 'none',
          }}
        />
        <span style={{ ...styles.statusText, color: statusColor[wsStatus] }}>
          {statusLabel[wsStatus]}
        </span>
        {queueLength > 0 && (
          <span style={styles.badge}>{queueLength}</span>
        )}
        {droppedChunks > 0 && (
          <span style={{ ...styles.badge, background: '#7f1d1d', color: '#fca5a5' }}>
            {droppedChunks}↓
          </span>
        )}
      </div>

      {/* VU meters — only show when capturing */}
      {isCapturing && (
        <div style={styles.vuContainer}>
          <VuMeter level={micLevel} label="MIC" />
          <VuMeter level={sysLevel} label="SYS" />
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  dot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusText: {
    fontSize: '12px',
    fontWeight: 500,
  },
  badge: {
    fontSize: '10px',
    padding: '2px 5px',
    borderRadius: '4px',
    background: '#1e3a5f',
    color: '#93c5fd',
    fontWeight: 600,
    fontFamily: 'monospace',
  },
  vuContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  vu: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  vuLabel: {
    fontSize: '9px',
    fontWeight: 700,
    color: '#64748b',
    width: '24px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    flexShrink: 0,
  },
  vuTrack: {
    flex: 1,
    height: '5px',
    background: '#0f1521',
    borderRadius: '2px',
    overflow: 'hidden',
    border: '1px solid #1e293b',
  },
  vuFill: {
    height: '100%',
    borderRadius: '2px',
  },
}
