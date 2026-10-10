import { useEffect, useState } from 'react'
import { useCaptureStore } from './store/captureStore'
import { getSettings, onStatusUpdate, onServerMessage } from './lib/ipc'
import { listAudioInputDevices } from './audio/micCapture'
import { mark, timed } from './lib/perf'
import { SettingsPanel } from './components/SettingsPanel'
import { TranscriptPanel } from './components/TranscriptPanel'
import { SuggestionPanel } from './components/SuggestionPanel'
import { CaptureControls } from './components/CaptureControls'
import type { Settings, ConnectionStatus } from '@shared/types'

type View = 'capture' | 'settings'

const statusColor: Record<ConnectionStatus, string> = {
  disconnected: '#64748b',
  connecting: '#f59e0b',
  connected: '#22c55e',
  error: '#ef4444',
}

export function App() {
  const setSettings = useCaptureStore((s) => s.setSettings)
  const applyStatusUpdate = useCaptureStore((s) => s.applyStatusUpdate)
  const handleServerMessage = useCaptureStore((s) => s.handleServerMessage)
  const setAvailableDevices = useCaptureStore((s) => s.setAvailableDevices)
  const settings = useCaptureStore((s) => s.settings)
  const error = useCaptureStore((s) => s.error)
  const wsStatus = useCaptureStore((s) => s.wsStatus)
  const isCapturing = useCaptureStore((s) => s.isCapturing)
  const availableDevices = useCaptureStore((s) => s.availableDevices)
  const selectedMicId = useCaptureStore((s) => s.selectedMicId)
  const selectMic = useCaptureStore((s) => s.selectMic)

  const [view, setView] = useState<View>('capture')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    mark('App mounted')
    timed('getSettings (IPC)', () => getSettings()).then((s) => {
      setSettings(s as Settings)
      setInitialized(true)
      mark('UI initialized')
    })
    const unsubStatus = onStatusUpdate(applyStatusUpdate)
    const unsubMessages = onServerMessage(handleServerMessage)
    return () => {
      unsubStatus()
      unsubMessages()
    }
  }, [setSettings, applyStatusUpdate, handleServerMessage])

  useEffect(() => {
    timed('listAudioInputDevices (probe getUserMedia)', () => listAudioInputDevices())
      .then(setAvailableDevices)
      .catch(console.warn)
  }, [setAvailableDevices])

  if (!initialized) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
      </div>
    )
  }

  const isConfigured = Boolean(
    settings?.userId?.trim() && settings?.backendUrl?.trim() && settings?.apiKey?.trim()
  )

  if (view === 'settings') {
    return (
      <div style={styles.root}>
        <header style={styles.topBar}>
          <button style={styles.backBtn} onClick={() => setView('capture')}>
            ← Back
          </button>
          <span style={styles.topBarTitle}>Settings</span>
        </header>
        <SettingsPanel onSaved={() => setView('capture')} />
      </div>
    )
  }

  const selectedLabel =
    availableDevices.find((d) => d.deviceId === selectedMicId)?.label ??
    'System default'

  return (
    <div style={styles.root}>
      {/* ── Top bar ── */}
      <header style={styles.topBar}>
        <div style={styles.statusChip}>
          <span
            style={{
              ...styles.statusDot,
              background: statusColor[wsStatus],
              boxShadow: wsStatus === 'connected' ? `0 0 5px ${statusColor[wsStatus]}` : 'none',
            }}
          />
          <span
            style={{
              ...styles.statusText,
              color: wsStatus === 'connected' ? '#22c55e' : statusColor[wsStatus],
            }}
          >
            {wsStatus === 'connected' ? 'Connected' :
             wsStatus === 'connecting' ? 'Connecting…' :
             wsStatus === 'error' ? 'Error' : 'Disconnected'}
          </span>
        </div>

        <div style={styles.topBarRight}>
          {/* Mic selector */}
          <div style={styles.micSelector}>
            <span style={styles.micIcon}>🎤</span>
            <select
              style={styles.micSelect}
              value={selectedMicId ?? ''}
              onChange={(e) => selectMic(e.target.value || undefined)}
              disabled={isCapturing}
              title={selectedLabel}
            >
              <option value="">System default</option>
              {availableDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Device ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
            <span style={styles.chevron}>›</span>
          </div>

          {/* Settings button */}
          <button
            style={styles.gearBtn}
            onClick={() => setView('settings')}
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      {/* ── Warnings ── */}
      {!isConfigured && (
        <div style={styles.banner}>
          ⚠ Not configured.{' '}
          <button style={styles.bannerLink} onClick={() => setView('settings')}>
            Open Settings
          </button>
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>
          {error}
        </div>
      )}

      {/* ── Capture controls ── */}
      <div style={styles.captureSection}>
        <CaptureControls />
      </div>

      {/* ── Transcripts ── */}
      <div style={styles.transcriptSection}>
        <TranscriptPanel />
      </div>

      {/* ── Suggested replies (bottom) ── */}
      <SuggestionPanel />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#0f1117',
    color: '#f1f5f9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    WebkitFontSmoothing: 'antialiased',
    overflow: 'hidden',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#0f1117',
  },
  spinner: {
    width: '28px',
    height: '28px',
    border: '2px solid #1e293b',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },

  // Top bar
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    height: '44px',
    borderBottom: '1px solid #1a2234',
    flexShrink: 0,
    gap: '8px',
  },
  topBarTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#94a3b8',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#6366f1',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '4px 0',
  },
  statusChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '12px',
    fontWeight: 600,
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    minWidth: 0,
    flex: 1,
    justifyContent: 'flex-end',
  },
  micSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: '#1a2234',
    border: '1px solid #1e293b',
    borderRadius: '6px',
    padding: '4px 8px',
    cursor: 'pointer',
    minWidth: 0,
    maxWidth: '160px',
  },
  micIcon: {
    fontSize: '11px',
    flexShrink: 0,
  },
  micSelect: {
    background: 'transparent',
    border: 'none',
    color: '#cbd5e1',
    fontSize: '11px',
    cursor: 'pointer',
    outline: 'none',
    minWidth: 0,
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  chevron: {
    color: '#475569',
    fontSize: '14px',
    flexShrink: 0,
    lineHeight: 1,
    transform: 'rotate(90deg)',
    display: 'block',
  },
  gearBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: '6px',
    lineHeight: 1,
    flexShrink: 0,
  },

  // Banners
  banner: {
    padding: '6px 12px',
    fontSize: '11px',
    color: '#fbbf24',
    background: '#1c1400',
    borderBottom: '1px solid #713f12',
    flexShrink: 0,
  },
  bannerLink: {
    background: 'none',
    border: 'none',
    color: '#fbbf24',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: '11px',
    padding: 0,
  },
  errorBox: {
    padding: '6px 12px',
    fontSize: '11px',
    color: '#f87171',
    background: '#1f0a0a',
    borderBottom: '1px solid #7f1d1d',
    flexShrink: 0,
  },

  // Capture section
  captureSection: {
    padding: '12px',
    borderBottom: '1px solid #1a2234',
    flexShrink: 0,
  },

  // Transcript section
  transcriptSection: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
}
