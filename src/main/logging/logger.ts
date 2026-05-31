import log from 'electron-log/main'

log.initialize()
log.transports.file.level = 'info'
log.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'warn'
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'

type Meta = Record<string, unknown>

export const logger = {
  debug: (msg: string, meta?: Meta) => log.debug(msg, meta ?? {}),
  info: (msg: string, meta?: Meta) => log.info(msg, meta ?? {}),
  warn: (msg: string, meta?: Meta) => log.warn(msg, meta ?? {}),
  error: (msg: string, meta?: Meta) => log.error(msg, meta ?? {}),
}
