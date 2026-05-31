/**
 * Fixed-capacity ring buffer. When full, pushes drop the oldest item.
 */
export class RingQueue<T> {
  private readonly buf: (T | undefined)[]
  private head = 0
  private tail = 0
  private size = 0

  constructor(readonly capacity: number) {
    this.buf = new Array<T | undefined>(capacity)
  }

  /**
   * Adds an item. Returns false and drops the oldest item if at capacity.
   */
  push(item: T): boolean {
    if (this.size === this.capacity) {
      this.head = (this.head + 1) % this.capacity
      this.size--
      this.buf[this.tail] = item
      this.tail = (this.tail + 1) % this.capacity
      this.size++
      return false
    }
    this.buf[this.tail] = item
    this.tail = (this.tail + 1) % this.capacity
    this.size++
    return true
  }

  pop(): T | undefined {
    if (this.size === 0) return undefined
    const item = this.buf[this.head]
    this.buf[this.head] = undefined
    this.head = (this.head + 1) % this.capacity
    this.size--
    return item
  }

  peek(): T | undefined {
    if (this.size === 0) return undefined
    return this.buf[this.head]
  }

  get length(): number {
    return this.size
  }

  isEmpty(): boolean {
    return this.size === 0
  }

  clear(): void {
    this.buf.fill(undefined)
    this.head = 0
    this.tail = 0
    this.size = 0
  }
}
