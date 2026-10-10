import { describe, it, expect } from 'vitest'
import {
  serializeChunk,
  createStartSessionMessage,
  createStopSessionMessage,
} from '../../src/main/websocket/protocol'
import { SAMPLE_RATE, CHANNELS } from '../../src/shared/constants'

describe('serializeChunk', () => {
  it('builds metadata from an ArrayBuffer', () => {
    const pcm = new Int16Array([1, 2, 3, 4]).buffer
    const out = serializeChunk({ sessionId: 's1', source: 'microphone', timestamp: 123, pcm })

    expect(out.metadata).toEqual({
      type: 'audio_chunk',
      session_id: 's1',
      source: 'microphone',
      timestamp: 123,
      size: 8,
    })
    expect(Buffer.isBuffer(out.pcm)).toBe(true)
    expect(out.pcm.length).toBe(8)
  })

  it('reuses a Buffer without copying', () => {
    const pcm = Buffer.from([1, 2, 3])
    const out = serializeChunk({ sessionId: 's', source: 'system', timestamp: 0, pcm })
    expect(out.pcm).toBe(pcm)
    expect(out.metadata.size).toBe(3)
    expect(out.metadata.source).toBe('system')
  })

  it('metadata.size always matches the binary frame length', () => {
    const pcm = new ArrayBuffer(16_000)
    const out = serializeChunk({ sessionId: 's', source: 'system', timestamp: 1, pcm })
    expect(out.metadata.size).toBe(out.pcm.length)
  })
})

describe('session messages', () => {
  it('start_session carries audio config and sources', () => {
    const msg = createStartSessionMessage('s1', 'user-1', ['microphone', 'system'])
    expect(msg).toEqual({
      type: 'start_session',
      session_id: 's1',
      user_id: 'user-1',
      sources: ['microphone', 'system'],
      audio_config: { sample_rate: SAMPLE_RATE, channels: CHANNELS, encoding: 'pcm16le' },
    })
  })

  it('stop_session', () => {
    expect(createStopSessionMessage('s1')).toEqual({ type: 'stop_session', session_id: 's1' })
  })
})
