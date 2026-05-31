import { EventEmitter } from 'events'
import WebSocket from 'ws'
import { RingQueue } from './queue'
import type { SerializedChunk } from './protocol'
import type { ConnectionStatus, StatusUpdate, ServerMessage, AudioSource } from '@shared/types'
import {
  RING_QUEUE_CAPACITY,
  HEARTBEAT_INTERVAL_MS,
  PONG_TIMEOUT_MS,
  RECONNECT_DELAYS_MS,
} from '@shared/constants'
import { logger } from '../logging/logger'
import { getSettings } from '../config/settings'
import { StaticCredentialsProvider } from '../auth/staticProvider'
import { createStartSessionMessage, createStopSessionMessage } from './protocol'

export declare interface AudioWebSocketClient {
  on(event: 'status', listener: (update: StatusUpdate) => void): this
  on(event: 'message', listener: (msg: ServerMessage) => void): this
  emit(event: 'status', update: StatusUpdate): boolean
  emit(event: 'message', msg: ServerMessage): boolean
}

export class AudioWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null
  private queue = new RingQueue<SerializedChunk>(RING_QUEUE_CAPACITY)
  private activeSessionId: string | null = null
  private sessionSources = new Set<AudioSource>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private pongTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempt = 0
  private wsStatus: ConnectionStatus = 'disconnected'
  private totalDropped = 0
  private destroyed = false

  constructor(private urlFactory: () => string, private headersFactory: () => Record<string, string>) {
    super()
  }

  startSession(sessionId: string, sources: AudioSource[]): void {
    if (this.destroyed) return

    this.activeSessionId = sessionId
    this.sessionSources = new Set(sources)

    if (this.ws?.readyState === WebSocket.OPEN) {
      const userId = new StaticCredentialsProvider().getUserId()
      const msg = createStartSessionMessage(sessionId, userId, sources)
      this.sendJSON(msg)
      logger.info('start_session sent', { sessionId, sources })
    }
  }

  stopSession(sessionId: string): void {
    if (this.destroyed) return
    if (sessionId !== this.activeSessionId) return

    if (this.ws?.readyState === WebSocket.OPEN) {
      const msg = createStopSessionMessage(sessionId)
      this.sendJSON(msg)
      logger.info('stop_session sent', { sessionId })
    }

    this.activeSessionId = null
    this.sessionSources.clear()
  }

  enqueue(chunk: SerializedChunk): void {
    if (this.destroyed) return

    // Registrar source si aún no estaba en la sesión activa
    if (this.activeSessionId === chunk.metadata.session_id) {
      this.sessionSources.add(chunk.metadata.source)
    }

    const accepted = this.queue.push(chunk)
    if (!accepted) {
      this.totalDropped++
      logger.warn('Audio chunk dropped — queue full', { dropped: this.totalDropped })
      this.emitStatus()
    }

    if (this.ws === null || this.ws.readyState !== WebSocket.OPEN) {
      this.connect()
    } else {
      this.drain()
    }
  }

  private sendJSON(obj: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    try {
      this.ws.send(JSON.stringify(obj))
    } catch (err) {
      logger.error('Failed to send JSON', { err: String(err) })
    }
  }

  private connect(): void {
    if (this.destroyed) return
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) return // already connecting/open

    let url: string
    try {
      url = this.urlFactory()
    } catch {
      logger.warn('WS URL not configured, skipping connect')
      return
    }

    if (!url) {
      logger.warn('WS URL is empty, skipping connect')
      return
    }

    this.setStatus('connecting')
    logger.info('WS connecting', { url, attempt: this.reconnectAttempt })

    this.ws = new WebSocket(url, { headers: this.headersFactory() })

    this.ws.on('open', () => {
      this.reconnectAttempt = 0
      this.setStatus('connected')
      logger.info('WS connected')
      this.startHeartbeat()

      // Enviar start_session si hay una sesión activa
      if (this.activeSessionId && this.sessionSources.size > 0) {
        const userId = new StaticCredentialsProvider().getUserId()
        const msg = createStartSessionMessage(
          this.activeSessionId,
          userId,
          Array.from(this.sessionSources)
        )
        this.sendJSON(msg)
        logger.info('start_session sent on reconnect', {
          sessionId: this.activeSessionId,
          sources: Array.from(this.sessionSources),
        })
      }

      this.drain()
    })

    this.ws.on('pong', () => {
      if (this.pongTimer) {
        clearTimeout(this.pongTimer)
        this.pongTimer = null
      }
    })

    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as ServerMessage
        this.emit('message', msg)
        logger.debug('WS message received', { type: msg.type })
      } catch (err) {
        logger.warn('Failed to parse server message', { err: String(err) })
      }
    })

    this.ws.on('close', (code, reason) => {
      logger.warn('WS closed', { code, reason: reason.toString() })
      this.cleanup()
      this.setStatus('disconnected')
      this.scheduleReconnect()
    })

    this.ws.on('error', (err) => {
      logger.error('WS error', { err: err.message })
      this.setStatus('error')
      // 'close' event fires after 'error', reconnect handled there
    })
  }

  private drain(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    while (!this.queue.isEmpty()) {
      const chunk = this.queue.pop()!
      try {
        // Enviar metadata JSON
        this.ws.send(JSON.stringify(chunk.metadata))
        // Enviar audio binario
        this.ws.send(chunk.pcm)
      } catch (err) {
        logger.error('WS send error', { err: String(err) })
        // Re-encolar
        this.queue.push(chunk)
        break
      }
    }
    this.emitStatus()
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

      this.pongTimer = setTimeout(() => {
        logger.warn('WS pong timeout — reconnecting')
        this.ws?.terminate()
      }, PONG_TIMEOUT_MS)

      this.ws.ping()
    }, HEARTBEAT_INTERVAL_MS)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    if (this.pongTimer) {
      clearTimeout(this.pongTimer)
      this.pongTimer = null
    }
  }

  private cleanup(): void {
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.removeAllListeners()
      this.ws = null
    }
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return
    if (this.reconnectTimer) return

    const delayMs = this.getBackoffDelay()
    logger.info('WS reconnect scheduled', { delayMs, attempt: this.reconnectAttempt })

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.reconnectAttempt++
      this.connect()
    }, delayMs)
  }

  private getBackoffDelay(): number {
    const base =
      RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)]
    const jitter = base * 0.2 * Math.random()
    return Math.floor(base + jitter)
  }

  private setStatus(status: ConnectionStatus): void {
    this.wsStatus = status
    this.emitStatus()
  }

  private emitStatus(): void {
    this.emit('status', {
      wsStatus: this.wsStatus,
      droppedChunks: this.totalDropped,
      queueLength: this.queue.length,
    })
  }

  /** Attempt to drain queue before quitting. Resolves after timeout. */
  async gracefulShutdown(timeoutMs = 3_000): Promise<void> {
    if (this.destroyed) return
    this.destroyed = true

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    await new Promise<void>((resolve) => {
      const deadline = setTimeout(() => resolve(), timeoutMs)

      const tryDrain = (): void => {
        this.drain()
        if (this.queue.isEmpty()) {
          clearTimeout(deadline)
          resolve()
        } else {
          setTimeout(tryDrain, 100)
        }
      }

      if (this.ws?.readyState === WebSocket.OPEN) {
        tryDrain()
      } else {
        clearTimeout(deadline)
        resolve()
      }
    })

    this.cleanup()
    logger.info('WS shutdown complete')
  }
}

// Module-level singleton
let instance: AudioWebSocketClient | null = null

export function getWsClient(): AudioWebSocketClient {
  if (!instance) {
    const creds = new StaticCredentialsProvider()

    instance = new AudioWebSocketClient(
      () => {
        const url = getSettings().backendUrl
        if (!url) throw new Error('backendUrl not configured')
        return url
      },
      () => creds.getAuthHeaders() ?? {}
    )
  }
  return instance
}

export async function shutdownWsClient(): Promise<void> {
  if (instance) {
    await instance.gracefulShutdown()
    instance = null
  }
}
