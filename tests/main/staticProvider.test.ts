import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  settings: { userId: '', backendUrl: '', apiKey: '' } as Record<string, string>,
}))

vi.mock('../../src/main/config/settings', () => ({
  getSettings: () => h.settings,
}))

import { StaticCredentialsProvider } from '../../src/main/auth/staticProvider'

beforeEach(() => {
  h.settings = { userId: 'laura', backendUrl: 'wss://api.test/v1/stt/stream', apiKey: 'sk-abc' }
})

describe('StaticCredentialsProvider', () => {
  it('authenticates with a Bearer token, not with a client-declared user id', () => {
    const headers = new StaticCredentialsProvider().getAuthHeaders()
    expect(headers).toEqual({ Authorization: 'Bearer sk-abc' })
    expect(headers).not.toHaveProperty('X-User-Id')
  })

  it('trims whitespace around the key', () => {
    h.settings.apiKey = '  sk-abc \n'
    expect(new StaticCredentialsProvider().getAuthHeaders()).toEqual({
      Authorization: 'Bearer sk-abc',
    })
  })

  it('sends no auth headers when there is no key', () => {
    h.settings.apiKey = '   '
    expect(new StaticCredentialsProvider().getAuthHeaders()).toBeUndefined()
  })

  it('still exposes the user id for start_session', () => {
    expect(new StaticCredentialsProvider().getUserId()).toBe('laura')
  })

  it.each([
    ['userId', ''],
    ['backendUrl', ''],
    ['apiKey', ''],
  ])('is not configured when %s is empty', (field, value) => {
    h.settings[field] = value
    expect(new StaticCredentialsProvider().isConfigured()).toBe(false)
  })

  it('is configured when user, url and key are all present', () => {
    expect(new StaticCredentialsProvider().isConfigured()).toBe(true)
  })
})
