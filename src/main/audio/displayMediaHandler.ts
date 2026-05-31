import { session, desktopCapturer } from 'electron'
import { logger } from '../logging/logger'

/**
 * Registers Chromium's display-media request handler so that
 * getDisplayMedia({ audio: true }) in the renderer gets WASAPI loopback
 * audio on Windows without showing a system picker.
 *
 * The video source is a minimal screen source; the renderer discards the
 * video track immediately after capture starts.
 */
export function setupDisplayMediaHandler(): void {
  session.defaultSession.setDisplayMediaRequestHandler(
    async (_request, callback) => {
      try {
        const sources = await desktopCapturer.getSources({ types: ['screen'] })

        if (sources.length === 0) {
          logger.warn('No screen sources found for display media handler')
          callback({})
          return
        }

        // audio: 'loopback' instructs Chromium to use WASAPI loopback on Windows
        callback({ video: sources[0], audio: 'loopback' })
        logger.debug('Display media handler resolved with loopback audio')
      } catch (err) {
        logger.error('Display media handler error', { err: String(err) })
        callback({})
      }
    },
    { useSystemPicker: false }
  )

  logger.info('Display media loopback handler registered')
}
