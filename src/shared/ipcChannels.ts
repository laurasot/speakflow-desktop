export const IPC = {
  CAPTURE_START: 'capture:start',
  CAPTURE_STOP: 'capture:stop',
  AUDIO_CHUNK: 'audio:chunk',
  STATUS_UPDATE: 'status:update',
  WS_MESSAGE: 'ws:message',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SAVE: 'settings:save',
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
