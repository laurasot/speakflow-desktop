import { systemPreferences } from 'electron'
import { logger } from '../logging/logger'

export async function ensureMicrophonePermission(): Promise<boolean> {
  if (process.platform !== 'win32') return true

  try {
    const status = systemPreferences.getMediaAccessStatus('microphone')
    logger.info('Microphone permission status', { status })

    if (status === 'granted') return true

    if (status === 'not-determined') {
      // On Windows, getUserMedia in renderer will trigger the OS dialog.
      // We log here for observability; the actual prompt happens in renderer.
      logger.info('Microphone permission not yet determined — renderer will prompt')
      return true
    }

    logger.warn('Microphone permission denied', { status })
    return false
  } catch (err) {
    // systemPreferences.getMediaAccessStatus is not available on all versions
    logger.warn('Could not check microphone permission', { err: String(err) })
    return true
  }
}
