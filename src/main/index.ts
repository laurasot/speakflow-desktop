import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './window/mainWindow'
import { setupDisplayMediaHandler } from './audio/displayMediaHandler'
import { setupIpcHandlers } from './ipc/handlers'
import { loadSettings } from './config/settings'
import { shutdownWsClient } from './websocket/client'
import { ensureMicrophonePermission } from './audio/permissions'
import { logger } from './logging/logger'

async function bootstrap(): Promise<void> {
  // Disable hardware acceleration to avoid GPU process crashes on some Windows setups
  app.disableHardwareAcceleration()

  await app.whenReady()

  logger.info('App starting', { version: app.getVersion(), pid: process.pid })

  loadSettings()
  setupDisplayMediaHandler()
  setupIpcHandlers()
  await ensureMicrophonePermission()

  createMainWindow()

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })

  let shuttingDown = false
  app.on('before-quit', (event) => {
    if (shuttingDown) return
    event.preventDefault()
    shuttingDown = true
    void (async () => {
      logger.info('App shutting down — draining WS queue')
      await shutdownWsClient()
      logger.info('Shutdown complete')
      app.exit(0)
    })()
  })
}

bootstrap().catch((err) => {
  logger.error('Bootstrap failed', { err: String(err) })
  process.exit(1)
})
