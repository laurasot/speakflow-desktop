import { describe, it, expect } from 'vitest'
import { RingQueue } from '../../src/main/websocket/queue'

describe('RingQueue', () => {
  it('starts empty', () => {
    const q = new RingQueue<number>(3)
    expect(q.isEmpty()).toBe(true)
    expect(q.length).toBe(0)
    expect(q.pop()).toBeUndefined()
    expect(q.peek()).toBeUndefined()
  })

  it('is FIFO', () => {
    const q = new RingQueue<number>(3)
    q.push(1)
    q.push(2)
    q.push(3)
    expect([q.pop(), q.pop(), q.pop()]).toEqual([1, 2, 3])
    expect(q.isEmpty()).toBe(true)
  })

  it('push returns true while there is room', () => {
    const q = new RingQueue<number>(2)
    expect(q.push(1)).toBe(true)
    expect(q.push(2)).toBe(true)
  })

  it('drops the oldest item and returns false when full', () => {
    const q = new RingQueue<number>(3)
    ;[1, 2, 3].forEach((n) => q.push(n))
    expect(q.push(4)).toBe(false)
    expect(q.length).toBe(3)
    expect([q.pop(), q.pop(), q.pop()]).toEqual([2, 3, 4])
  })

  it('keeps only the newest `capacity` items after many overflows', () => {
    const q = new RingQueue<number>(4)
    for (let i = 1; i <= 100; i++) q.push(i)
    expect(q.length).toBe(4)
    expect([q.pop(), q.pop(), q.pop(), q.pop()]).toEqual([97, 98, 99, 100])
  })

  it('peek does not remove', () => {
    const q = new RingQueue<string>(2)
    q.push('a')
    expect(q.peek()).toBe('a')
    expect(q.length).toBe(1)
  })

  it('works across wrap-around of head/tail', () => {
    const q = new RingQueue<number>(3)
    q.push(1)
    q.push(2)
    q.pop()
    q.push(3)
    q.push(4)
    expect([q.pop(), q.pop(), q.pop()]).toEqual([2, 3, 4])
  })

  it('clear resets the queue and it stays usable', () => {
    const q = new RingQueue<number>(2)
    q.push(1)
    q.push(2)
    q.clear()
    expect(q.isEmpty()).toBe(true)
    expect(q.pop()).toBeUndefined()
    q.push(9)
    expect(q.pop()).toBe(9)
  })
})
