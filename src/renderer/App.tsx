import { useEffect, useState } from 'react'
import { useCaptureStore } from './store/captureStore'
import { getSettings, onStatusUpdate, onServerMessage } from './lib/ipc'
import { listAudioInputDevices } from './audio/micCapture'
import { CaptureControls } from './components/CaptureControls'
import { StatusPanel } from './components/StatusPanel'
import { DevicePicker } from './components/DevicePicker'
import { SettingsPanel } from './components/SettingsPanel'
import { TranscriptPanel } from './components/TranscriptPanel'
import type { Settings } from '@shared/types'

type View = 'capture' | 'settings'

export function App() {
  const setSettings = useCaptureStore((s) => s.setSettings)
  const applyStatusUpdate = useCaptureStore((s) => s.applyStatusUpdate)
  const handleServerMessage = useCaptureStore((s) => s.handleServerMessage)
  const setAvailableDevices = useCaptureStore((s) => s.setAvailableDevices)
  const settings = useCaptureStore((s) => s.settings)
  const error = useCaptureStore((s) => s.error)
  const isCapturing = useCaptureStore((s) => s.isCapturing)

  const [view, setView] = useState<View>('capture')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // Load settings from main
    getSettings().then((s) => {
      setSettings(s as Settings)
      setInitialized(true)
    })

    // Subscribe to WS status updates from main
    const unsubStatus = onStatusUpdate(applyStatusUpdate)
    const unsubMessages = onServerMessage(handleServerMessage)
    
    return () => {
      unsubStatus()
      unsubMessages()
    }
  }, [setSettings, applyStatusUpdate, handleServerMessage])

  useEffect(() => {
    // Enumerate microphone devices once the app is ready
    listAudioInputDevices().then(setAvailableDevices).catch(console.warn)
  }, [setAvailableDevices])

  if (!initialized) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
      </div>
    )
  }

  const isConfigured = Boolean(settings?.userId?.trim() && settings?.backendUrl?.trim())

  return (
    <div style={styles.root}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoMark}>●</span>
          <span style={styles.logoText}>SpeakFlow</span>
        </div>
        <button
          style={{
            ...styles.iconBtn,
            color: view === 'settings' ? '#6366f1' : '#94a3b8',
          }}
          onClick={() => setView(view === 'settings' ? 'capture' : 'settings')}
          title="Settings"
        >
          ⚙
        </button>
      </header>

      <main style={styles.main}>
        {view === 'settings' ? (
          <SettingsPanel onSaved={() => setView('capture')} />
        ) : (
          <>
            {!isConfigured && (
              <div style={styles.banner}>
                <span style={styles.bannerIcon}>⚠</span>
                User ID and backend URL not configured.{' '}
                <button style={styles.bannerLink} onClick={() => setView('settings')}>
                  Open Settings
                </button>
              </div>
            )}

            <section style={styles.section}>
              <DevicePicker disabled={isCapturing} />
            </section>

            <section style={styles.section}>
              <CaptureControls />
            </section>

            {error && (
              <div style={styles.errorBox}>
                <strong>Error:</strong> {error}
              </div>
            )}

            <section style={styles.section}>
              <StatusPanel />
            </section>

            <TranscriptPanel />
          </>
        )}
      </main>
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
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    WebkitFontSmoothing: 'antialiased',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #1e293b',
    flexShrink: 0,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoMark: {
    color: '#6366f1',
    fontSize: '18px',
  },
  logoText: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#f8fafc',
    letterSpacing: '-0.01em',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: '6px',
    lineHeight: 1,
    transition: 'color 0.15s',
  },
  main: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  banner: {
    background: '#1c1400',
    border: '1px solid #713f12',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#fcd34d',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  bannerIcon: {
    flexShrink: 0,
  },
  bannerLink: {
    background: 'none',
    border: 'none',
    color: '#fbbf24',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: '13px',
    padding: 0,
  },
  errorBox: {
    background: '#1f0a0a',
    border: '1px solid #7f1d1d',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#f87171',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#0f1117',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #1e293b',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
}
