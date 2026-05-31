import type { CHUNK_MS, SAMPLE_RATE, CHANNELS } from './constants'

// ─── Audio ───────────────────────────────────────────────────────────────────

export type AudioSource = 'microphone' | 'system'

/** Chunk payload sent from renderer → preload → main via IPC */
export interface AudioChunkIpc {
  sessionId: string
  source: AudioSource
  /** ms-epoch timestamp of the first sample in this chunk */
  timestamp: number
  /** PCM 16-bit LE mono 16 kHz — arrives as Buffer in Node.js main process */
  pcm: ArrayBuffer
}

// ─── WebSocket Protocol (cliente → servidor) ────────────────────────────────

export interface StartSessionMessage {
  type: 'start_session'
  session_id: string
  user_id: string
  sources: AudioSource[]
  audio_config: {
    sample_rate: number
    channels: number
    encoding: 'pcm16le'
  }
}

export interface AudioChunkMetadata {
  type: 'audio_chunk'
  session_id: string
  source: AudioSource
  timestamp: number
  size: number // bytes del frame binario que sigue
}

export interface StopSessionMessage {
  type: 'stop_session'
  session_id: string
}

// Frame binario: enviado inmediatamente después de AudioChunkMetadata
// pcm: Buffer (PCM 16-bit LE, mono, 16 kHz)

// ─── WebSocket Protocol (servidor → cliente) ────────────────────────────────

export interface SessionStartedMessage {
  type: 'session_started'
  session_id: string
}

export interface TranscriptMessage {
  type: 'transcript'
  session_id: string
  source: AudioSource
  text: string
  is_final: boolean
  timestamp?: number
}

export interface SessionEndedMessage {
  type: 'session_ended'
  session_id: string
}

export interface ErrorMessage {
  type: 'error'
  code: string
  message: string
  session_id?: string
}

export type ServerMessage =
  | SessionStartedMessage
  | TranscriptMessage
  | SessionEndedMessage
  | ErrorMessage

// ─── Settings ────────────────────────────────────────────────────────────────

export interface Settings {
  userId: string
  backendUrl: string
  chunkMs: typeof CHUNK_MS
  sampleRate: typeof SAMPLE_RATE
  channels: typeof CHANNELS
}

// ─── Status ──────────────────────────────────────────────────────────────────

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface StatusUpdate {
  wsStatus: ConnectionStatus
  droppedChunks: number
  queueLength: number
}

// ─── Capture control ─────────────────────────────────────────────────────────

export interface StartCaptureOptions {
  sessionId: string
}

export interface StartCaptureResult {
  success: boolean
  error?: string
}

// ─── Preload bridge API (exposed via contextBridge) ──────────────────────────

export interface SpeakflowBridgeAPI {
  startCapture: (opts: StartCaptureOptions) => Promise<StartCaptureResult>
  stopCapture: () => Promise<void>
  pushChunk: (chunk: AudioChunkIpc) => void
  onStatusUpdate: (cb: (status: StatusUpdate) => void) => () => void
  onServerMessage: (cb: (msg: ServerMessage) => void) => () => void
  getSettings: () => Promise<Settings>
  saveSettings: (settings: Partial<Settings>) => Promise<Settings>
}
