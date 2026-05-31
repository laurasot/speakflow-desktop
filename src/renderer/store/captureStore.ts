import { create } from 'zustand'
import type { ConnectionStatus, Settings, StatusUpdate, ServerMessage, TranscriptMessage } from '@shared/types'

interface CaptureState {
  // Capture state
  isCapturing: boolean
  sessionId: string | null
  error: string | null

  // WS status
  wsStatus: ConnectionStatus
  droppedChunks: number
  queueLength: number

  // Audio levels (RMS 0–1)
  micLevel: number
  sysLevel: number

  // Device selection
  selectedMicId: string | undefined
  availableDevices: MediaDeviceInfo[]

  // Settings
  settings: Settings | null

  // Transcripts
  transcripts: TranscriptMessage[]

  // Actions
  setCapturing: (capturing: boolean, sessionId?: string) => void
  setError: (error: string | null) => void
  applyStatusUpdate: (update: StatusUpdate) => void
  setMicLevel: (level: number) => void
  setSysLevel: (level: number) => void
  selectMic: (deviceId: string | undefined) => void
  setAvailableDevices: (devices: MediaDeviceInfo[]) => void
  setSettings: (settings: Settings) => void
  handleServerMessage: (msg: ServerMessage) => void
  clearTranscripts: () => void
}

export const useCaptureStore = create<CaptureState>((set) => ({
  isCapturing: false,
  sessionId: null,
  error: null,

  wsStatus: 'disconnected',
  droppedChunks: 0,
  queueLength: 0,

  micLevel: 0,
  sysLevel: 0,

  selectedMicId: undefined,
  availableDevices: [],

  settings: null,

  transcripts: [],

  setCapturing: (capturing, sessionId) =>
    set({ isCapturing: capturing, sessionId: sessionId ?? null, error: null }),

  setError: (error) => set({ error }),

  applyStatusUpdate: (update) =>
    set({
      wsStatus: update.wsStatus,
      droppedChunks: update.droppedChunks,
      queueLength: update.queueLength,
    }),

  setMicLevel: (level) => set({ micLevel: level }),
  setSysLevel: (level) => set({ sysLevel: level }),

  selectMic: (deviceId) => set({ selectedMicId: deviceId }),

  setAvailableDevices: (devices) => set({ availableDevices: devices }),

  setSettings: (settings) => set({ settings }),

  handleServerMessage: (msg) => {
    if (msg.type === 'transcript') {
      set((state) => ({
        transcripts: [...state.transcripts.slice(-49), msg], // keep last 50
      }))
    } else if (msg.type === 'error') {
      set({ error: `Server error: ${msg.message}` })
    }
  },

  clearTranscripts: () => set({ transcripts: [] }),
}))
