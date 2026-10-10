import { describe, it, expect, beforeEach } from 'vitest'
import { useCaptureStore } from '../../src/renderer/store/captureStore'
import type { TranscriptMessage, SuggestionMessage } from '../../src/shared/types'

const initial = useCaptureStore.getState()
const get = () => useCaptureStore.getState()

const transcript = (over: Partial<TranscriptMessage> = {}): TranscriptMessage => ({
  type: 'transcript',
  session_id: 's1',
  source: 'microphone',
  text: 'hola',
  is_final: false,
  ...over,
})

const suggestion = (n: number): SuggestionMessage => ({
  type: 'suggestion',
  session_id: 's1',
  source: 'system',
  based_on: 'q',
  trigger_reason: 'repeated_question',
  suggestion: `s${n}`,
  timestamp: n,
})

beforeEach(() => useCaptureStore.setState(initial, true))

describe('captureStore capture state', () => {
  it('setCapturing stores sessionId and clears error', () => {
    get().setError('boom')
    get().setCapturing(true, 'abc')
    expect(get()).toMatchObject({ isCapturing: true, sessionId: 'abc', error: null })
  })

  it('setCapturing(false) resets sessionId', () => {
    get().setCapturing(true, 'abc')
    get().setCapturing(false)
    expect(get().sessionId).toBeNull()
  })

  it('applyStatusUpdate copies ws status and counters', () => {
    get().applyStatusUpdate({ wsStatus: 'connected', droppedChunks: 2, queueLength: 5 })
    expect(get()).toMatchObject({ wsStatus: 'connected', droppedChunks: 2, queueLength: 5 })
  })
})

describe('captureStore transcripts', () => {
  it('partials are keyed by session+source and replaced', () => {
    get().handleServerMessage(transcript({ text: 'a' }))
    get().handleServerMessage(transcript({ text: 'ab' }))
    get().handleServerMessage(transcript({ source: 'system', text: 'x' }))

    const cur = get().currentTranscripts
    expect(cur.size).toBe(2)
    expect(cur.get('s1-microphone')?.text).toBe('ab')
  })

  it('a final moves the partial to finalTranscripts', () => {
    get().handleServerMessage(transcript({ text: 'ab' }))
    get().handleServerMessage(transcript({ text: 'abc', is_final: true }))

    expect(get().currentTranscripts.size).toBe(0)
    expect(get().finalTranscripts.map((t) => t.text)).toEqual(['abc'])
  })

  it('keeps only the last 10 finals', () => {
    for (let i = 0; i < 15; i++) {
      get().handleServerMessage(transcript({ text: `t${i}`, is_final: true }))
    }
    const finals = get().finalTranscripts
    expect(finals).toHaveLength(10)
    expect(finals[0].text).toBe('t5')
    expect(finals[9].text).toBe('t14')
  })

  it('clearTranscripts empties both', () => {
    get().handleServerMessage(transcript())
    get().handleServerMessage(transcript({ is_final: true }))
    get().clearTranscripts()
    expect(get().currentTranscripts.size).toBe(0)
    expect(get().finalTranscripts).toHaveLength(0)
  })
})

describe('captureStore suggestions and errors', () => {
  it('keeps only the last 5 suggestions, newest last', () => {
    for (let i = 0; i < 8; i++) get().handleServerMessage(suggestion(i))
    expect(get().suggestions.map((s) => s.suggestion)).toEqual(['s3', 's4', 's5', 's6', 's7'])
  })

  it('server error message sets error', () => {
    get().handleServerMessage({ type: 'error', code: 'X', message: 'bad' })
    expect(get().error).toBe('Server error: bad')
  })

  it('ignores session_started / session_ended', () => {
    get().handleServerMessage({ type: 'session_started', session_id: 's1' })
    get().handleServerMessage({ type: 'session_ended', session_id: 's1' })
    expect(get().error).toBeNull()
    expect(get().suggestions).toHaveLength(0)
  })
})
