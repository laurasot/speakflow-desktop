import { useState, type FormEvent } from 'react'
import type { Settings } from '@shared/types'
import { saveSettings } from '../lib/ipc'
import { useCaptureStore } from '../store/captureStore'

interface Props {
  onSaved?: () => void
}

export function SettingsPanel({ onSaved }: Props) {
  const settings = useCaptureStore((s) => s.settings)
  const setSettings = useCaptureStore((s) => s.setSettings)

  const [userId, setUserId] = useState(settings?.userId ?? '')
  const [backendUrl, setBackendUrl] = useState(settings?.backendUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    setSaved(false)
    try {
      const updated = await saveSettings({ userId: userId.trim(), backendUrl: backendUrl.trim() })
      setSettings(updated as Settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved?.()
    } catch (e) {
      setErr(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>Settings</h2>
      <p style={styles.subtitle}>Configure your connection before starting capture.</p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          User ID
          <input
            style={styles.input}
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="e.g. john.doe"
            autoComplete="off"
          />
        </label>

        <label style={styles.label}>
          Backend WebSocket URL
          <input
            style={styles.input}
            type="url"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            placeholder="wss://your-backend.example.com/ws/audio"
            autoComplete="off"
          />
        </label>

        {err && <p style={styles.errorText}>{err}</p>}

        <button
          style={{
            ...styles.btn,
            opacity: saving ? 0.6 : 1,
            background: saved ? '#22c55e' : '#6366f1',
          }}
          type="submit"
          disabled={saving}
        >
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </button>
      </form>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#f8fafc',
  },
  subtitle: {
    margin: 0,
    fontSize: '13px',
    color: '#94a3b8',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '8px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '13px',
    color: '#cbd5e1',
    fontWeight: 500,
  },
  input: {
    background: '#1e2433',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '8px 12px',
    color: '#f1f5f9',
    fontSize: '14px',
    outline: 'none',
  },
  btn: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
    alignSelf: 'flex-start',
  },
  errorText: {
    margin: 0,
    fontSize: '12px',
    color: '#f87171',
  },
}
