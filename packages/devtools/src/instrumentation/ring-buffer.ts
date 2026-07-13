/**
 * Fixed-capacity ring buffer. Overwrites the oldest entry once full, mirroring
 * `MetricsCollector`'s eviction approach. An optional `onEvict` fires when an
 * entry is overwritten so callers can keep side indexes (e.g. a by-id map) in sync.
 */
export class RingBuffer<T> {
  private buffer: T[] = [];
  private cursor = 0;
  private total = 0;

  constructor(
    private capacity: number,
    private readonly onEvict?: (evicted: T) => void,
  ) {}

  configure(capacity: number): void {
    if (capacity > 0 && capacity !== this.capacity) {
      this.capacity = capacity;
      this.clear();
    }
  }

  push(item: T): void {
    this.total += 1;
    if (this.buffer.length < this.capacity) {
      this.buffer.push(item);
      return;
    }
    const evicted = this.buffer[this.cursor];
    this.buffer[this.cursor] = item;
    this.cursor = (this.cursor + 1) % this.capacity;
    if (evicted !== undefined && this.onEvict) {
      this.onEvict(evicted);
    }
  }

  /** All retained entries in insertion order (oldest → newest). */
  toArray(): T[] {
    if (this.buffer.length < this.capacity) {
      return [...this.buffer];
    }
    return [...this.buffer.slice(this.cursor), ...this.buffer.slice(0, this.cursor)];
  }

  /** Retained entries newest → oldest, optionally capped. */
  recent(limit?: number): T[] {
    const all = this.toArray().reverse();
    return typeof limit === 'number' ? all.slice(0, limit) : all;
  }

  filter(predicate: (item: T) => boolean): T[] {
    return this.toArray().filter(predicate);
  }

  get size(): number {
    return this.buffer.length;
  }

  get totalSeen(): number {
    return this.total;
  }

  clear(): void {
    this.buffer = [];
    this.cursor = 0;
    this.total = 0;
  }
}
