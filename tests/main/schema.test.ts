import { describe, it, expect } from 'vitest'
import { settingsSchema } from '../../src/main/config/schema'
import { CHUNK_MS, SAMPLE_RATE, CHANNELS, FRAME_SIZE } from '../../src/shared/constants'

describe('settingsSchema', () => {
  it('fills defaults from an empty object', () => {
    expect(settingsSchema.parse({})).toEqual({
      userId: '',
      backendUrl: '',
      apiKey: '',
      chunkMs: CHUNK_MS,
      sampleRate: SAMPLE_RATE,
      channels: CHANNELS,
    })
  })

  it('keeps user-provided values', () => {
    const s = settingsSchema.parse({ userId: 'u', backendUrl: 'ws://x/ws' })
    expect(s.userId).toBe('u')
    expect(s.backendUrl).toBe('ws://x/ws')
  })

  it.each([
    ['chunkMs', 1000],
    ['sampleRate', 44_100],
    ['channels', 2],
  ])('rejects a non-supported %s', (key, value) => {
    expect(() => settingsSchema.parse({ [key]: value })).toThrow()
  })

  it('rejects wrong types', () => {
    expect(() => settingsSchema.parse({ userId: 123 })).toThrow()
  })
})

describe('audio constants', () => {
  it('FRAME_SIZE is samples per chunk', () => {
    expect(FRAME_SIZE).toBe(8_000)
    expect(FRAME_SIZE).toBe((SAMPLE_RATE * CHUNK_MS) / 1000)
  })

  it('a PCM16 chunk is ~16 KB as documented', () => {
    expect(FRAME_SIZE * 2).toBe(16_000)
  })
})
