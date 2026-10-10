import { describe, it, expect, vi } from 'vitest'
import { timed, mark } from '../../src/renderer/lib/perf'

describe('perf probes', () => {
  it('timed returns the wrapped value and logs a [perf] line', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const out = await timed('thing', async () => 42)
    expect(out).toBe(42)
    expect(info).toHaveBeenCalledOnce()
    expect(info.mock.calls[0][0]).toMatch(/^\[perf\] thing \d+ms$/)
  })

  it('timed still logs and rethrows when the function fails', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    await expect(timed('bad', async () => { throw new Error('x') })).rejects.toThrow('x')
    expect(info).toHaveBeenCalledOnce()
  })

  it('mark logs with the [perf] prefix', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    mark('boot')
    expect(info.mock.calls[0][0]).toMatch(/^\[perf\] boot @\d+ms/)
  })
})
