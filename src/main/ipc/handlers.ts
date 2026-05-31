import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '@shared/ipcChannels'
import type { StartCaptureOptions, AudioSource, StatusUpdate } from '@shared/types'
import { serializeChunk, type RawChunk } from '../websocket/protocol'
import { getWsClient } from '../websocket/client'
import { getSettings, updateSettings } from '../config/settings'
import { logger } from '../logging/logger'

let activeSessionId: string | null = null

export function setupIpcHandlers(): void {
  // ── Capture lifecycle ────────────────────────────────────────────────────

  ipcMain.handle(IPC.CAPTURE_START, async (_event, opts: StartCaptureOptions) => {
    activeSessionId = opts.sessionId
    logger.info('Capture started', { sessionId: activeSessionId })
    
    // Notificar al WS client que inicie la sesión (enviará start_session)
    getWsClient().startSession(activeSessionId, ['microphone', 'system'])
    
    return { success: true }
  })

  ipcMain.handle(IPC.CAPTURE_STOP, async () => {
    if (activeSessionId) {
      getWsClient().stopSession(activeSessionId)
      logger.info('Capture stopped', { sessionId: activeSessionId })
    }
    activeSessionId = null
    return { success: true }
  })

  // ── Audio chunk streaming ────────────────────────────────────────────────

  ipcMain.on(
    IPC.AUDIO_CHUNK,
    (_event, raw: { sessionId: string; source: AudioSource; timestamp: number; pcm: Buffer }) => {
      if (!raw || !raw.pcm) return

      const chunk: RawChunk = {
        sessionId: raw.sessionId,
        source: raw.source,
        timestamp: raw.timestamp,
        pcm: raw.pcm,
      }

      const serialized = serializeChunk(chunk)
      getWsClient().enqueue(serialized)
    }
  )

  // ── Settings ─────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.SETTINGS_GET, () => {
    return getSettings()
  })

  ipcMain.handle(IPC.SETTINGS_SAVE, (_event, patch: Record<string, unknown>) => {
    const updated = updateSettings(patch as Parameters<typeof updateSettings>[0])
    return updated
  })

  // ── WS status → renderer ─────────────────────────────────────────────────

  const wsClient = getWsClient()

  wsClient.on('status', (update: StatusUpdate) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.STATUS_UPDATE, update)
      }
    })
  })

  wsClient.on('message', (msg: import('@shared/types').ServerMessage) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC.WS_MESSAGE, msg)
      }
    })
    logger.debug('Server message forwarded to renderer', { type: msg.type })
  })

  logger.info('IPC handlers registered')
}
