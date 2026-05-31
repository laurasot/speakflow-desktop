import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { logger } from '../logging/logger'

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 480,
    height: 700,
    minWidth: 400,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f1117',
    title: 'SpeakFlow',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  // Open external links in the OS browser, not in Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.NODE_ENV === 'development') {
    const devUrl = process.env['ELECTRON_RENDERER_URL'] ?? 'http://localhost:5173'
    win.loadURL(devUrl)
    win.webContents.openDevTools({ mode: 'detach' })
    logger.debug('Renderer loaded from dev server', { url: devUrl })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
    logger.debug('Renderer loaded from built files')
  }

  logger.info('Main window created')
  return win
}
