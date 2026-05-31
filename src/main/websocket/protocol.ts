import type { AudioSource, AudioChunkMetadata, StartSessionMessage, StopSessionMessage } from '@shared/types'
import { SAMPLE_RATE, CHANNELS } from '@shared/constants'

export interface RawChunk {
  sessionId: string
  source: AudioSource
  timestamp: number
  /** Arrives as Node.js Buffer after IPC structured-clone deserialization */
  pcm: Buffer | ArrayBuffer
}

export interface SerializedChunk {
  metadata: AudioChunkMetadata
  pcm: Buffer
}

export function serializeChunk(chunk: RawChunk): SerializedChunk {
  const pcmBuffer =
    Buffer.isBuffer(chunk.pcm)
      ? chunk.pcm
      : Buffer.from(chunk.pcm as ArrayBuffer)

  return {
    metadata: {
      type: 'audio_chunk',
      session_id: chunk.sessionId,
      source: chunk.source,
      timestamp: chunk.timestamp,
      size: pcmBuffer.length,
    },
    pcm: pcmBuffer,
  }
}

export function createStartSessionMessage(
  sessionId: string,
  userId: string,
  sources: AudioSource[]
): StartSessionMessage {
  return {
    type: 'start_session',
    session_id: sessionId,
    user_id: userId,
    sources,
    audio_config: {
      sample_rate: SAMPLE_RATE,
      channels: CHANNELS,
      encoding: 'pcm16le',
    },
  }
}

export function createStopSessionMessage(sessionId: string): StopSessionMessage {
  return {
    type: 'stop_session',
    session_id: sessionId,
  }
}
