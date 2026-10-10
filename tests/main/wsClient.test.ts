import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'

const h = vi.hoisted(() => ({ instances: [] as any[] }))

vi.mock('ws', async () => {
  const { EventEmitter } = await import('events')
  class FakeWS extends EventEmitter {
    static CONNECTING = 0
    static OPEN = 1
    static CLOSING = 2
    static CLOSED = 3
    readyState = 0
    sent: unknown[] = []
    constructor(public url: string, public opts: unknown) {
      super()
      h.instances.push(this)
    }
    send(data: unknown) { this.sent.push(data) }
    ping() {}
    terminate() { this.serverClose(1006) }
    // test helpers
    serverOpen() { this.readyState = 1; this.emit('open') }
    serverClose(code = 1006) {
      this.readyState = 3
      this.emit('close', code, Buffer.from(''))
    }
  }
  return { default: FakeWS }
})

vi.mock('../../src/main/logging/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('../../src/main/config/settings', () => ({
  getSettings: () => ({ userId: 'u1', backendUrl: 'ws://test/ws' }),
}))

import { AudioWebSocketClient } from '../../src/main/websocket/client'
import type { SerializedChunk } from '../../src/main/websocket/protocol'

const chunk = (n = 0, sessionId = 's1', source: 'microphone' | 'system' = 'microphone'): SerializedChunk => ({
  metadata: { type: 'audio_chunk', session_id: sessionId, source, timestamp: n, size: 2 },
  pcm: Buffer.from([1, 2]),
})

const make = (url = 'ws://test/ws') => new AudioWebSocketClient(() => url, () => ({ 'X-User-Id': 'u1' }))
const last = () => h.instances[h.instances.length - 1]

beforeEach(() => {
  h.instances.length = 0
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

describe('AudioWebSocketClient connection', () => {
  it('connects lazily on first enqueue with auth headers', () => {
    const c = make()
    expect(h.instances).toHaveLength(0)
    c.enqueue(chunk())
    expect(h.instances).toHaveLength(1)
    expect(last().url).toBe('ws://test/ws')
    expect(last().opts).toEqual({ headers: { 'X-User-Id': 'u1' } })
  })

  it('does not connect when the URL factory throws or returns empty', () => {
    const throwing = new AudioWebSocketClient(() => { throw new Error('no url') }, () => ({}))
    throwing.enqueue(chunk())
    make('').enqueue(chunk())
    expect(h.instances).toHaveLength(0)
  })

  it('does not open a second socket while one is connecting', () => {
    const c = make()
    c.enqueue(chunk(1))
    c.enqueue(chunk(2))
    expect(h.instances).toHaveLength(1)
  })

  it('emits status connecting → connected', () => {
    const c = make()
    const seen: string[] = []
    c.on('status', (s) => seen.push(s.wsStatus))
    c.enqueue(chunk())
    last().serverOpen()
    expect(seen).toContain('connecting')
    expect(seen[seen.length - 1]).toBe('connected')
  })
})

describe('AudioWebSocketClient sending', () => {
  it('flushes queued chunks as metadata JSON + binary frame, in order', () => {
    const c = make()
    c.enqueue(chunk(1))
    c.enqueue(chunk(2))
    last().serverOpen()

    const sent = last().sent
    expect(sent).toHaveLength(4)
    expect(JSON.parse(sent[0]).timestamp).toBe(1)
    expect(Buffer.isBuffer(sent[1])).toBe(true)
    expect(JSON.parse(sent[2]).timestamp).toBe(2)
  })

  it('sends immediately when already open', () => {
    const c = make()
    c.enqueue(chunk(1))
    last().serverOpen()
    last().sent.length = 0
    c.enqueue(chunk(2))
    expect(last().sent).toHaveLength(2)
  })

  it('reports queue length in status', () => {
    const c = make()
    let status: any
    c.on('status', (s) => (status = s))
    c.enqueue(chunk(1))
    c.enqueue(chunk(2))
    // enqueue while connecting does not emit; open drains and emits final status
    last().serverOpen()
    expect(status.queueLength).toBe(0)
  })

  it('counts dropped chunks once the 60s buffer (120) overflows', () => {
    const c = make()
    let dropped = 0
    c.on('status', (s) => (dropped = s.droppedChunks))
    for (let i = 0; i < 125; i++) c.enqueue(chunk(i))
    expect(dropped).toBe(5)
    last().serverOpen()
    // the oldest were dropped: first sent timestamp is 5
    expect(JSON.parse(last().sent[0]).timestamp).toBe(5)
  })
})

describe('AudioWebSocketClient sessions', () => {
  it('sends start_session when the socket is already open', () => {
    const c = make()
    c.enqueue(chunk())
    last().serverOpen()
    last().sent.length = 0

    c.startSession('s1', ['microphone', 'system'])
    expect(JSON.parse(last().sent[0])).toMatchObject({
      type: 'start_session',
      session_id: 's1',
      user_id: 'u1',
      sources: ['microphone', 'system'],
    })
  })

  it('re-sends start_session on reconnect with the sources seen', () => {
    const c = make()
    c.startSession('s1', ['microphone'])
    c.enqueue(chunk(1, 's1', 'microphone'))
    c.enqueue(chunk(2, 's1', 'system'))
    last().serverOpen()

    const first = JSON.parse(last().sent[0])
    expect(first.type).toBe('start_session')
    expect(first.sources.sort()).toEqual(['microphone', 'system'])
  })

  it('stopSession sends stop only for the active session', () => {
    const c = make()
    c.enqueue(chunk())
    last().serverOpen()
    c.startSession('s1', ['microphone'])
    last().sent.length = 0

    c.stopSession('other')
    expect(last().sent).toHaveLength(0)
    c.stopSession('s1')
    expect(JSON.parse(last().sent[0])).toEqual({ type: 'stop_session', session_id: 's1' })
  })
})

describe('AudioWebSocketClient server messages', () => {
  it('emits parsed server messages', () => {
    const c = make()
    const onMsg = vi.fn()
    c.on('message', onMsg)
    c.enqueue(chunk())
    last().serverOpen()
    last().emit('message', Buffer.from(JSON.stringify({ type: 'session_started', session_id: 's1' })))
    expect(onMsg).toHaveBeenCalledWith({ type: 'session_started', session_id: 's1' })
  })

  it('ignores malformed JSON without throwing', () => {
    const c = make()
    const onMsg = vi.fn()
    c.on('message', onMsg)
    c.enqueue(chunk())
    last().serverOpen()
    expect(() => last().emit('message', Buffer.from('{not json'))).not.toThrow()
    expect(onMsg).not.toHaveBeenCalled()
  })
})

describe('AudioWebSocketClient reconnect', () => {
  it('reconnects after close following the backoff schedule', () => {
    const c = make()
    c.enqueue(chunk())
    last().serverClose()
    expect(h.instances).toHaveLength(1)

    vi.advanceTimersByTime(700) // first delay is 500ms + up to 20% jitter
    expect(h.instances).toHaveLength(2)
  })

  it('backoff grows on consecutive failures', () => {
    const c = make()
    c.enqueue(chunk())
    last().serverClose() // attempt 0 → ~500ms
    vi.advanceTimersByTime(700)
    expect(h.instances).toHaveLength(2)

    last().serverClose() // attempt 1 → ~1000ms
    vi.advanceTimersByTime(700)
    expect(h.instances).toHaveLength(2) // not yet
    vi.advanceTimersByTime(600)
    expect(h.instances).toHaveLength(3)
  })

  // Regression: main.log showed retries every ~170-340ms while the backend was down,
  // because enqueue() called connect() on every chunk and bypassed the backoff timer.
  it('does not bypass the backoff when new chunks arrive while disconnected', () => {
    const c = make()
    c.enqueue(chunk(0))
    last().serverClose()
    expect(h.instances).toHaveLength(1)

    // audio keeps arriving every 500ms; the backoff delay (~500ms+) is still pending
    c.enqueue(chunk(1))
    c.enqueue(chunk(2))
    expect(h.instances).toHaveLength(1)

    // and the scheduled retry still fires
    vi.advanceTimersByTime(700)
    expect(h.instances).toHaveLength(2)
  })

  it('keeps growing the backoff while chunks keep arriving', () => {
    const c = make()
    c.enqueue(chunk(0))
    // simulate 10s of a dead backend with a chunk every 500ms
    for (let t = 0; t < 10_000; t += 500) {
      last().serverClose?.()
      c.enqueue(chunk(t))
      vi.advanceTimersByTime(500)
    }
    // delays 0.5+1+2+4 s ⇒ at most ~5 attempts in 10s (was ~20 before the fix)
    expect(h.instances.length).toBeLessThanOrEqual(6)
  })

  it('stops reconnecting after gracefulShutdown', async () => {
    const c = make()
    c.enqueue(chunk())
    last().serverClose()
    await c.gracefulShutdown(100)
    vi.advanceTimersByTime(60_000)
    expect(h.instances).toHaveLength(1)
  })

  it('ignores enqueue after shutdown', async () => {
    const c = make()
    await c.gracefulShutdown(100)
    c.enqueue(chunk())
    expect(h.instances).toHaveLength(0)
  })
})

describe('AudioWebSocketClient heartbeat', () => {
  it('terminates the socket if pong does not arrive', () => {
    const c = make()
    c.enqueue(chunk())
    const ws = last()
    ws.terminate = vi.fn()
    ws.serverOpen()

    vi.advanceTimersByTime(20_000) // heartbeat → ping
    vi.advanceTimersByTime(10_000) // pong timeout
    expect(ws.terminate).toHaveBeenCalled()
  })

  it('pong cancels the timeout', () => {
    const c = make()
    c.enqueue(chunk())
    const ws = last()
    ws.terminate = vi.fn()
    ws.serverOpen()

    vi.advanceTimersByTime(20_000)
    ws.emit('pong')
    vi.advanceTimersByTime(10_000)
    expect(ws.terminate).not.toHaveBeenCalled()
  })
})
