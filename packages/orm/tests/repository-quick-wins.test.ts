import { describe, expect, it } from 'bun:test';
import { ObjectId, type Collection } from 'mongodb';
import type { BaseDocument, DocumentMetadata } from '../src/interfaces/document';
import { MongoRepository } from '../src/repository/mongo-repository';
import { EntityNotFoundException } from '../src/exceptions/entity-not-found.exception';
import { WriteNotifier, type EntityWriteEvent } from '../src/events/write-notifier';

interface Row extends BaseDocument {
  _id: ObjectId;
  id: string;
  name: string;
  score?: number;
  visits?: number;
  deletedAt?: Date | null;
}

class RowDoc {
  _id?: ObjectId;
  name!: string;
}

const oid = (n: number): ObjectId => new ObjectId(n.toString(16).padStart(24, '0'));

const compareValues = (a: unknown, b: unknown): number => {
  const av = a instanceof ObjectId ? a.toHexString() : a;
  const bv = b instanceof ObjectId ? b.toHexString() : b;
  if (av instanceof Date && bv instanceof Date) return av.getTime() - bv.getTime();
  if (typeof av === 'number' && typeof bv === 'number') return av - bv;
  const as = String(av);
  const bs = String(bv);
  return as < bs ? -1 : as > bs ? 1 : 0;
};

const idEquals = (condition: unknown, value: unknown): boolean => {
  const c = condition instanceof ObjectId ? condition.toHexString() : condition;
  const v = value instanceof ObjectId ? value.toHexString() : value;
  return c === v;
};

const matchesValue = (condition: unknown, value: unknown): boolean => {
  if (condition instanceof ObjectId) return idEquals(condition, value);
  if (condition && typeof condition === 'object' && !(condition instanceof Date)) {
    const cond = condition as Record<string, unknown>;
    if ('$exists' in cond) return Boolean(cond.$exists) ? value !== undefined : value === undefined;
    if ('$in' in cond && Array.isArray(cond.$in)) return cond.$in.some((i) => matchesValue(i, value));
    if ('$ne' in cond) return !matchesValue(cond.$ne, value);
    if ('$gt' in cond) return value !== undefined && compareValues(value, cond.$gt) > 0;
    if ('$gte' in cond) return value !== undefined && compareValues(value, cond.$gte) >= 0;
    if ('$lt' in cond) return value !== undefined && compareValues(value, cond.$lt) < 0;
    if ('$lte' in cond) return value !== undefined && compareValues(value, cond.$lte) <= 0;
  }
  if (value instanceof ObjectId || condition instanceof ObjectId) return idEquals(condition, value);
  return condition === value;
};

const matchesFilter = (filter: Record<string, unknown>, doc: Record<string, unknown>): boolean => {
  if (!filter || Object.keys(filter).length === 0) return true;
  if ('$and' in filter) return (filter.$and as Record<string, unknown>[]).every((c) => matchesFilter(c, doc));
  if ('$or' in filter) return (filter.$or as Record<string, unknown>[]).some((c) => matchesFilter(c, doc));
  for (const [key, condition] of Object.entries(filter)) {
    if (key === '_id' || key === 'id') {
      if (!matchesValue(condition, doc[key])) return false;
      continue;
    }
    if (!matchesValue(condition, doc[key])) return false;
  }
  return true;
};

const applySort = (docs: Row[], sort?: unknown): Row[] => {
  if (!sort) return docs;
  const entries = Array.isArray(sort)
    ? (sort as Array<[string, number]>)
    : Object.entries(sort as Record<string, number>);
  return [...docs].sort((a, b) => {
    for (const [field, dir] of entries) {
      const cmp = compareValues((a as Record<string, unknown>)[field], (b as Record<string, unknown>)[field]);
      if (cmp !== 0) return dir === -1 ? -cmp : cmp;
    }
    return 0;
  });
};

interface FindOpts {
  sort?: unknown;
  limit?: number;
  projection?: Record<string, number>;
}

const makeCursor = (docs: Row[]) => ({
  toArray: async () => docs.map((d) => ({ ...d })),
  async *[Symbol.asyncIterator]() {
    for (const d of docs) yield { ...d };
  },
  close: async () => {},
});

const createStore = (rows: Row[]) => {
  const store = new Map<string, Row>(rows.map((r) => [r._id.toHexString(), r]));
  const query = (filter: Record<string, unknown>): Row[] =>
    [...store.values()].filter((r) => matchesFilter(filter, r as unknown as Record<string, unknown>));

  const collection = {
    find: (filter: Record<string, unknown>, opts: FindOpts = {}) => {
      let docs = query(filter);
      docs = applySort(docs, opts.sort);
      if (typeof opts.limit === 'number') docs = docs.slice(0, opts.limit);
      return makeCursor(docs);
    },
    findOne: async (filter: Record<string, unknown>) => {
      const [first] = query(filter);
      return first ? { ...first } : null;
    },
    countDocuments: async (filter: Record<string, unknown>, opts: { limit?: number } = {}) => {
      const n = query(filter).length;
      return typeof opts.limit === 'number' ? Math.min(n, opts.limit) : n;
    },
    distinct: async (field: string, filter: Record<string, unknown>) => {
      const values = query(filter).map((r) => (r as Record<string, unknown>)[field]);
      return [...new Set(values)];
    },
    aggregate: (pipeline: Array<Record<string, unknown>>) => {
      // Apply only leading $match stages — enough to exercise the soft-delete guard.
      let docs = [...store.values()];
      for (const stage of pipeline) {
        if ('$match' in stage) docs = docs.filter((r) => matchesFilter(stage.$match as Record<string, unknown>, r as unknown as Record<string, unknown>));
        else break;
      }
      return { ...makeCursor(docs), __pipeline: pipeline };
    },
    updateMany: async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
      const matched = query(filter);
      for (const row of matched) {
        if (update.$inc) {
          for (const [k, v] of Object.entries(update.$inc as Record<string, number>)) {
            (row as Record<string, unknown>)[k] = ((row as Record<string, unknown>)[k] as number ?? 0) + v;
          }
        }
        if (update.$currentDate) (row as Record<string, unknown>).updatedAt = new Date();
      }
      return { matchedCount: matched.length, modifiedCount: matched.length };
    },
    findOneAndUpdate: async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
      const [row] = query(filter);
      if (!row) return null;
      if (update.$set) Object.assign(row, update.$set);
      if (update.$unset) for (const k of Object.keys(update.$unset as object)) delete (row as Record<string, unknown>)[k];
      return { ...row };
    },
  } as unknown as Collection<Row & BaseDocument>;

  return { store, collection };
};

const metadata = (over: Partial<DocumentMetadata> = {}): DocumentMetadata => ({
  target: RowDoc,
  collection: 'rows',
  timestamps: true,
  softDelete: true,
  indexes: [],
  ...over,
});

describe('MongoRepository quick wins', () => {
  it('exists() is soft-delete aware', async () => {
    const { collection } = createStore([
      { _id: oid(1), id: oid(1).toHexString(), name: 'live', deletedAt: null },
      { _id: oid(2), id: oid(2).toHexString(), name: 'gone', deletedAt: new Date() },
    ]);
    const repo = new MongoRepository<Row>(collection, metadata());
    expect(await repo.exists({ name: 'live' })).toBe(true);
    expect(await repo.exists({ name: 'gone' })).toBe(false);
    expect(await repo.exists({ name: 'gone' }, { withDeleted: true })).toBe(true);
  });

  it('findOneOrFail / findByIdOrFail throw EntityNotFoundException (NOT_FOUND)', async () => {
    const { collection } = createStore([]);
    const repo = new MongoRepository<Row>(collection, metadata());
    let thrown: unknown;
    try {
      await repo.findOneOrFail({ name: 'nope' });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(EntityNotFoundException);
    expect((thrown as EntityNotFoundException).code).toBe('NOT_FOUND');
    expect((thrown as EntityNotFoundException).entityName).toBe('RowDoc');
    await expect(repo.findByIdOrFail(oid(99))).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('updateOne() returns the mapped post-image and emits an update event', async () => {
    const { collection } = createStore([
      { _id: oid(1), id: oid(1).toHexString(), name: 'old', deletedAt: null },
    ]);
    const notifier = new WriteNotifier('default');
    const events: EntityWriteEvent[] = [];
    notifier.onWrite((e) => void events.push(e));
    const repo = new MongoRepository<Row>(collection, metadata(), notifier);

    const updated = await repo.updateOne({ id: oid(1).toHexString() }, { name: 'new' });
    expect(updated?.name).toBe('new');
    expect(updated?.id).toBe(oid(1).toHexString());
    expect(events).toHaveLength(1);
    expect(events[0]!.operation).toBe('update');

    const missing = await repo.updateOne({ id: oid(2).toHexString() }, { name: 'x' });
    expect(missing).toBeNull();
  });

  it('updateOne() excludes soft-deleted rows unless withDeleted', async () => {
    const { collection } = createStore([
      { _id: oid(1), id: oid(1).toHexString(), name: 'old', deletedAt: new Date() },
    ]);
    const repo = new MongoRepository<Row>(collection, metadata());
    expect(await repo.updateOne({ id: oid(1).toHexString() }, { name: 'new' })).toBeNull();
    const forced = await repo.updateOne({ id: oid(1).toHexString() }, { name: 'new' }, { withDeleted: true });
    expect(forced?.name).toBe('new');
  });

  it('increment() bumps a numeric field and returns modifiedCount', async () => {
    const { store, collection } = createStore([
      { _id: oid(1), id: oid(1).toHexString(), name: 'a', visits: 5, deletedAt: null },
    ]);
    const repo = new MongoRepository<Row>(collection, metadata());
    const n = await repo.increment({ id: oid(1).toHexString() }, 'visits', 3);
    expect(n).toBe(1);
    expect(store.get(oid(1).toHexString())?.visits).toBe(8);
  });

  it('distinct() returns unique soft-delete-filtered values', async () => {
    const { collection } = createStore([
      { _id: oid(1), id: oid(1).toHexString(), name: 'a', score: 1, deletedAt: null },
      { _id: oid(2), id: oid(2).toHexString(), name: 'b', score: 1, deletedAt: null },
      { _id: oid(3), id: oid(3).toHexString(), name: 'c', score: 2, deletedAt: null },
      { _id: oid(4), id: oid(4).toHexString(), name: 'd', score: 9, deletedAt: new Date() },
    ]);
    const repo = new MongoRepository<Row>(collection, metadata());
    const scores = (await repo.distinct<number>('score')).sort();
    expect(scores).toEqual([1, 2]);
    const all = (await repo.distinct<number>('score', {}, { withDeleted: true })).sort();
    expect(all).toEqual([1, 2, 9]);
  });

  it('aggregate() prepends a not-deleted $match unless withDeleted', async () => {
    const { collection } = createStore([
      { _id: oid(1), id: oid(1).toHexString(), name: 'live', deletedAt: null },
      { _id: oid(2), id: oid(2).toHexString(), name: 'gone', deletedAt: new Date() },
    ]);
    const repo = new MongoRepository<Row>(collection, metadata());
    const guarded = await repo.aggregate([{ $project: { name: 1 } }]);
    expect(guarded.map((d) => d.name).sort()).toEqual(['live']);
    const all = await repo.aggregate([{ $project: { name: 1 } }], { withDeleted: true });
    expect(all.map((d) => d.name).sort()).toEqual(['gone', 'live']);
  });

  it('aggregate() adds no guard when the document has no soft-delete', async () => {
    const { collection } = createStore([
      { _id: oid(1), id: oid(1).toHexString(), name: 'a', deletedAt: new Date() },
    ]);
    const repo = new MongoRepository<Row>(collection, metadata({ softDelete: false }));
    const out = await repo.aggregate([{ $project: { name: 1 } }]);
    expect(out).toHaveLength(1);
  });

  it('findCursor() streams mapped docs honouring soft-delete', async () => {
    const { collection } = createStore([
      { _id: oid(1), id: oid(1).toHexString(), name: 'a', deletedAt: null },
      { _id: oid(2), id: oid(2).toHexString(), name: 'b', deletedAt: new Date() },
      { _id: oid(3), id: oid(3).toHexString(), name: 'c', deletedAt: null },
    ]);
    const repo = new MongoRepository<Row>(collection, metadata());
    const names: string[] = [];
    for await (const doc of repo.findCursor()) {
      expect(typeof doc.id).toBe('string');
      names.push(doc.name);
    }
    expect(names.sort()).toEqual(['a', 'c']);
  });

  it('findAndCount() returns items and total in parallel', async () => {
    const { collection } = createStore([
      { _id: oid(1), id: oid(1).toHexString(), name: 'a', deletedAt: null },
      { _id: oid(2), id: oid(2).toHexString(), name: 'a', deletedAt: null },
      { _id: oid(3), id: oid(3).toHexString(), name: 'b', deletedAt: null },
    ]);
    const repo = new MongoRepository<Row>(collection, metadata());
    const [items, total] = await repo.findAndCount({ name: 'a' });
    expect(total).toBe(2);
    expect(items).toHaveLength(2);
  });

  it('paginate() walks 3 pages with ties on the sort field — no dupes or skips', async () => {
    const scores = [10, 10, 20, 20, 20, 30, 30];
    const rows: Row[] = scores.map((score, i) => ({
      _id: oid(i + 1),
      id: oid(i + 1).toHexString(),
      name: `n${i + 1}`,
      score,
      deletedAt: null,
    }));
    const { collection } = createStore(rows);
    const repo = new MongoRepository<Row>(collection, metadata());

    const seen: string[] = [];
    let cursor: string | undefined;
    let pages = 0;
    do {
      const page = await repo.paginate({}, { limit: 3, cursor, sort: { score: 1 } });
      pages += 1;
      for (const item of page.items) seen.push(item.id);
      cursor = page.nextCursor ?? undefined;
      if (!page.hasMore) break;
    } while (cursor && pages < 10);

    // All 7 rows exactly once, in score-then-_id order.
    expect(seen).toHaveLength(7);
    expect(new Set(seen).size).toBe(7);
    expect(seen).toEqual(rows.map((r) => r.id));
    expect(pages).toBe(3);
  });

  it('paginate() rejects a cursor produced under a different sort', async () => {
    const rows: Row[] = [1, 2, 3].map((n) => ({
      _id: oid(n),
      id: oid(n).toHexString(),
      name: `n${n}`,
      score: n,
      deletedAt: null,
    }));
    const { collection } = createStore(rows);
    const repo = new MongoRepository<Row>(collection, metadata());
    const first = await repo.paginate({}, { limit: 1, sort: { score: 1 } });
    expect(first.nextCursor).not.toBeNull();
    await expect(
      repo.paginate({}, { limit: 1, cursor: first.nextCursor!, sort: { score: -1 } }),
    ).rejects.toThrow(/different sort/);
  });

  it('save() is atomic — a single findOneAndUpdate round trip returns the post-image', async () => {
    const { store, collection } = createStore([
      { _id: oid(1), id: oid(1).toHexString(), name: 'before', deletedAt: null },
    ]);
    let findOneCalls = 0;
    const original = collection.findOne;
    (collection as unknown as { findOne: unknown }).findOne = async (...args: unknown[]) => {
      findOneCalls += 1;
      return (original as (...a: unknown[]) => Promise<unknown>).apply(collection, args);
    };
    const repo = new MongoRepository<Row>(collection, metadata());
    const updated = await repo.save({ id: oid(1).toHexString(), name: 'after' });
    expect(updated.name).toBe('after');
    expect(store.get(oid(1).toHexString())?.name).toBe('after');
    expect(findOneCalls).toBe(0);
  });
});
