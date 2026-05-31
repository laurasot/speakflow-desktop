/**
 * Typed wrappers over window.speakflow contextBridge API.
 * Components import from here, never from window.speakflow directly.
 */
import type {
  StartCaptureOptions,
  StartCaptureResult,
  AudioChunkIpc,
  Settings,
  StatusUpdate,
  ServerMessage,
} from '@shared/types'

export function startCapture(opts: StartCaptureOptions): Promise<StartCaptureResult> {
  return window.speakflow.startCapture(opts)
}

export function stopCapture(): Promise<void> {
  return window.speakflow.stopCapture()
}

export function pushChunk(chunk: AudioChunkIpc): void {
  window.speakflow.pushChunk(chunk)
}

export function onStatusUpdate(cb: (status: StatusUpdate) => void): () => void {
  return window.speakflow.onStatusUpdate(cb)
}

export function onServerMessage(cb: (msg: ServerMessage) => void): () => void {
  return window.speakflow.onServerMessage(cb)
}

export function getSettings(): Promise<Settings> {
  return window.speakflow.getSettings()
}

export function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  return window.speakflow.saveSettings(patch)
}
