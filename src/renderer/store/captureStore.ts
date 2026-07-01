import { create } from 'zustand'
import type {
  ConnectionStatus,
  Settings,
  StatusUpdate,
  ServerMessage,
  TranscriptMessage,
  SuggestionMessage,
} from '@shared/types'

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

  // Transcripts (consolidated)
  currentTranscripts: Map<string, TranscriptMessage> // key: `${session_id}-${source}`
  finalTranscripts: TranscriptMessage[]

  // AI suggestions (latest last)
  suggestions: SuggestionMessage[]

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
  clearSuggestions: () => void
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

  currentTranscripts: new Map(),
  finalTranscripts: [],
  suggestions: [],

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
      set((state) => {
        const key = `${msg.session_id}-${msg.source}`
        const newCurrent = new Map(state.currentTranscripts)
        const newFinal = [...state.finalTranscripts]

        if (msg.is_final) {
          // Move to final transcripts, remove from current
          newFinal.push(msg)
          newCurrent.delete(key)
          
          // Keep only last 10 final transcripts
          if (newFinal.length > 10) {
            newFinal.shift()
          }
        } else {
          // Update current partial
          newCurrent.set(key, msg)
        }

        return {
          currentTranscripts: newCurrent,
          finalTranscripts: newFinal,
        }
      })
    } else if (msg.type === 'suggestion') {
      set((state) => {
        const next = [...state.suggestions, msg]
        if (next.length > 5) next.shift()
        return { suggestions: next }
      })
    } else if (msg.type === 'error') {
      set({ error: `Server error: ${msg.message}` })
    }
  },

  clearTranscripts: () => set({ currentTranscripts: new Map(), finalTranscripts: [] }),

  clearSuggestions: () => set({ suggestions: [] }),
}))
