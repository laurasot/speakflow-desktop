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
      setTimeout(() => { setSaved(false); onSaved?.() }, 1200)
    } catch (e) {
      setErr(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={s.panel}>
      <form onSubmit={handleSubmit} style={s.form}>
        <div style={s.field}>
          <label style={s.label}>User ID</label>
          <input
            style={s.input}
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="e.g. john.doe"
            autoComplete="off"
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>Backend WebSocket URL</label>
          <input
            style={s.input}
            type="url"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            placeholder="wss://your-backend.example.com/ws/audio"
            autoComplete="off"
          />
        </div>

        {err && <p style={s.errorText}>{err}</p>}

        <button
          style={{
            ...s.btn,
            background: saved ? '#22c55e' : '#6366f1',
            opacity: saving ? 0.6 : 1,
          }}
          type="submit"
          disabled={saving}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </form>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  panel: {
    padding: '16px 12px',
    flex: 1,
    overflow: 'auto',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    background: '#1a2234',
    border: '1px solid #1e293b',
    borderRadius: '6px',
    padding: '8px 10px',
    color: '#e2e8f0',
    fontSize: '12px',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  btn: {
    padding: '9px 16px',
    borderRadius: '6px',
    border: 'none',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.2s',
    alignSelf: 'flex-start',
    marginTop: '4px',
  },
  errorText: {
    margin: 0,
    fontSize: '11px',
    color: '#f87171',
  },
}
