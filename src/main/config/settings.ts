import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { settingsSchema, type SettingsSchema } from './schema'
import { logger } from '../logging/logger'

let current: SettingsSchema | null = null

function settingsPath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'settings.json')
}

export function loadSettings(): SettingsSchema {
  const path = settingsPath()
  try {
    if (existsSync(path)) {
      const raw = JSON.parse(readFileSync(path, 'utf-8'))
      current = settingsSchema.parse(raw)
      logger.info('Settings loaded', { path })
    } else {
      current = settingsSchema.parse({})
      persistSettings(current)
      logger.info('Settings initialized with defaults', { path })
    }
  } catch (err) {
    logger.warn('Failed to parse settings, resetting to defaults', { err: String(err) })
    current = settingsSchema.parse({})
    persistSettings(current)
  }
  return current
}

export function getSettings(): SettingsSchema {
  if (!current) return loadSettings()
  return current
}

export function updateSettings(patch: Partial<SettingsSchema>): SettingsSchema {
  const merged = { ...getSettings(), ...patch }
  current = settingsSchema.parse(merged)
  persistSettings(current)
  logger.info('Settings saved')
  return current
}

function persistSettings(settings: SettingsSchema): void {
  try {
    writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
  } catch (err) {
    logger.error('Failed to persist settings', { err: String(err) })
  }
}
