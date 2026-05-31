import { useCaptureStore } from '../store/captureStore'

interface Props {
  disabled?: boolean
}

export function DevicePicker({ disabled }: Props) {
  const devices = useCaptureStore((s) => s.availableDevices)
  const selectedMicId = useCaptureStore((s) => s.selectedMicId)
  const selectMic = useCaptureStore((s) => s.selectMic)

  if (devices.length === 0) {
    return (
      <div style={styles.empty}>
        No microphone devices found
      </div>
    )
  }

  return (
    <label style={styles.label}>
      <span style={styles.labelText}>Microphone</span>
      <select
        style={{ ...styles.select, opacity: disabled ? 0.5 : 1 }}
        value={selectedMicId ?? ''}
        onChange={(e) => selectMic(e.target.value || undefined)}
        disabled={disabled}
      >
        <option value="">System default</option>
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `Device ${d.deviceId.slice(0, 8)}`}
          </option>
        ))}
      </select>
    </label>
  )
}

const styles: Record<string, React.CSSProperties> = {
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  labelText: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  select: {
    background: '#1e2433',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '8px 10px',
    color: '#f1f5f9',
    fontSize: '13px',
    cursor: 'pointer',
    outline: 'none',
  },
  empty: {
    fontSize: '13px',
    color: '#64748b',
    fontStyle: 'italic',
  },
}
