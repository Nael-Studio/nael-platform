import { ObjectId } from 'mongodb';

/**
 * Minimal DataLoader-style batching helper for GraphQL resolvers, with no hard
 * dependency on any GraphQL package. `.load(id)` calls made within the same
 * microtask are coalesced into a single `$in` query against the repository, so
 * per-field resolvers never trigger N+1 reads.
 *
 * ```ts
 * const userLoader = createEntityLoader(userRepo);
 * // in a resolver: () => userLoader.load(post.authorId)
 * ```
 */
export interface EntityLoader<T> {
  load(id: string | ObjectId): Promise<T | null>;
  loadMany(ids: Array<string | ObjectId>): Promise<Array<T | null>>;
  prime(id: string | ObjectId, value: T): void;
  clear(id?: string | ObjectId): void;
}

/** The slice of a repository the loader needs. Structural, so any repo satisfies it. */
export interface LoaderSource<T> {
  find(filter: unknown, options?: unknown): Promise<T[]>;
}

const keyOf = (id: string | ObjectId): string =>
  id instanceof ObjectId ? id.toHexString() : String(id);

const indexKeys = (doc: Record<string, unknown>): string[] => {
  const keys: string[] = [];
  if (typeof doc.id === 'string') keys.push(doc.id);
  if (doc._id instanceof ObjectId) keys.push(doc._id.toHexString());
  else if (typeof doc._id === 'string') keys.push(doc._id);
  return keys;
};

export function createEntityLoader<T extends { id?: string; _id?: unknown }>(
  source: LoaderSource<T>,
): EntityLoader<T> {
  const cache = new Map<string, Promise<T | null>>();
  let pending: Map<string, Array<(value: T | null) => void>> | null = null;
  let rejecters: Array<(error: unknown) => void> = [];

  const dispatch = (): void => {
    const batch = pending!;
    const rejectAll = rejecters;
    pending = null;
    rejecters = [];

    const keys = [...batch.keys()];
    const objectIds = keys.filter((k) => ObjectId.isValid(k)).map((k) => new ObjectId(k));
    const filter = { $or: [{ id: { $in: keys } }, { _id: { $in: [...keys, ...objectIds] } }] };

    source
      .find(filter)
      .then((docs) => {
        const byKey = new Map<string, T>();
        for (const doc of docs) {
          for (const key of indexKeys(doc as Record<string, unknown>)) {
            byKey.set(key, doc);
          }
        }
        for (const [key, resolvers] of batch) {
          const value = byKey.get(key) ?? null;
          resolvers.forEach((resolve) => resolve(value));
        }
      })
      .catch((error) => {
        rejectAll.forEach((reject) => reject(error));
      });
  };

  const load = (id: string | ObjectId): Promise<T | null> => {
    const key = keyOf(id);
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }
    const promise = new Promise<T | null>((resolve, reject) => {
      if (!pending) {
        pending = new Map();
        queueMicrotask(dispatch);
      }
      const resolvers = pending.get(key) ?? [];
      resolvers.push(resolve);
      pending.set(key, resolvers);
      rejecters.push(reject);
    });
    cache.set(key, promise);
    return promise;
  };

  return {
    load,
    loadMany: (ids) => Promise.all(ids.map((id) => load(id))),
    prime: (id, value) => {
      cache.set(keyOf(id), Promise.resolve(value));
    },
    clear: (id) => {
      if (id === undefined) {
        cache.clear();
      } else {
        cache.delete(keyOf(id));
      }
    },
  };
}
