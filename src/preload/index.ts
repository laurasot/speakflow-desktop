import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type {
  SpeakflowBridgeAPI,
  StartCaptureOptions,
  AudioChunkIpc,
  Settings,
  StatusUpdate,
} from '@shared/types'

const api: SpeakflowBridgeAPI = {
  startCapture: (opts: StartCaptureOptions) =>
    ipcRenderer.invoke(IPC.CAPTURE_START, opts),

  stopCapture: () =>
    ipcRenderer.invoke(IPC.CAPTURE_STOP),

  pushChunk: (chunk: AudioChunkIpc) =>
    ipcRenderer.send(IPC.AUDIO_CHUNK, chunk),

  onStatusUpdate: (cb: (status: StatusUpdate) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: StatusUpdate) => cb(status)
    ipcRenderer.on(IPC.STATUS_UPDATE, handler)
    return () => ipcRenderer.removeListener(IPC.STATUS_UPDATE, handler)
  },

  onServerMessage: (cb: (msg: import('@shared/types').ServerMessage) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, msg: import('@shared/types').ServerMessage) => cb(msg)
    ipcRenderer.on(IPC.WS_MESSAGE, handler)
    return () => ipcRenderer.removeListener(IPC.WS_MESSAGE, handler)
  },

  getSettings: (): Promise<Settings> =>
    ipcRenderer.invoke(IPC.SETTINGS_GET),

  saveSettings: (patch: Partial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke(IPC.SETTINGS_SAVE, patch),
}

contextBridge.exposeInMainWorld('speakflow', api)
