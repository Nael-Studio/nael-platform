/** Wrap a source async iterator, yielding only values that pass `predicate`. */
export async function* filterAsyncIterator<T>(
  source: AsyncIterableIterator<T>,
  predicate: (value: T) => boolean | Promise<boolean>,
): AsyncGenerator<T> {
  try {
    for await (const value of source) {
      if (await predicate(value)) {
        yield value;
      }
    }
  } finally {
    await source.return?.();
  }
}

/**
 * Merge several async iterators into one, yielding values as they arrive.
 * Calling `.return()` (e.g. via `for await` early break) cancels every source.
 */
export function mergeAsyncIterators<T>(
  iterators: AsyncIterableIterator<T>[],
): AsyncIterableIterator<T> {
  if (iterators.length === 1) {
    return iterators[0]!;
  }

  const queue: T[] = [];
  const waiters: Array<(result: IteratorResult<T>) => void> = [];
  let remaining = iterators.length;
  let closed = false;

  const emit = (value: T): void => {
    if (closed) {
      return;
    }
    const waiter = waiters.shift();
    if (waiter) {
      waiter({ value, done: false });
    } else {
      queue.push(value);
    }
  };

  const finishOne = (): void => {
    remaining -= 1;
    if (remaining === 0) {
      closed = true;
      while (waiters.length) {
        waiters.shift()!({ value: undefined as unknown as T, done: true });
      }
    }
  };

  for (const iterator of iterators) {
    void (async () => {
      try {
        for await (const value of iterator) {
          if (closed) {
            break;
          }
          emit(value);
        }
      } catch {
        // A source erroring just ends that branch.
      } finally {
        finishOne();
      }
    })();
  }

  return {
    next(): Promise<IteratorResult<T>> {
      if (queue.length) {
        return Promise.resolve({ value: queue.shift()!, done: false });
      }
      if (closed) {
        return Promise.resolve({ value: undefined as unknown as T, done: true });
      }
      return new Promise((resolve) => waiters.push(resolve));
    },
    return(): Promise<IteratorResult<T>> {
      closed = true;
      for (const iterator of iterators) {
        void iterator.return?.();
      }
      while (waiters.length) {
        waiters.shift()!({ value: undefined as unknown as T, done: true });
      }
      return Promise.resolve({ value: undefined as unknown as T, done: true });
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}
