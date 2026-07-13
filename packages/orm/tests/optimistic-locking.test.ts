import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { ObjectId, type Collection } from 'mongodb';
import type { BaseDocument } from '../src/interfaces/document';
import { Document, getDocumentMetadata } from '../src/decorators/document';
import { Prop } from '../src/decorators/prop';
import { Version } from '../src/decorators/version';
import { MongoRepository } from '../src/repository/mongo-repository';
import { OptimisticLockException } from '../src/exceptions/optimistic-lock.exception';

@Document({ collection: 'locked', timestamps: false, softDelete: false })
class Locked {
  @Prop() name!: string;
  @Version() version!: number;
}

interface Row extends BaseDocument {
  _id: ObjectId;
  id: string;
  name: string;
  version: number;
}

const createCollection = (rows: Row[]) => {
  const store = new Map(rows.map((r) => [r._id.toHexString(), r]));
  const idKey = (v: unknown) => (v instanceof ObjectId ? v.toHexString() : String(v));
  const matchIds = (filter: any, r: Row): boolean => {
    // Handles { $and: [ idFilter, {version} ] } and plain id filters used in tests.
    if (filter.$and) return filter.$and.every((f: any) => matchIds(f, r));
    if (filter.$or) return filter.$or.some((f: any) => matchIds(f, r));
    if ('version' in filter) return r.version === filter.version;
    if ('id' in filter) return r.id === idKey(filter.id);
    if ('_id' in filter) return idKey(r._id) === idKey(filter._id);
    return true;
  };
  return {
    findOneAndUpdate: async (filter: any, update: any) => {
      for (const r of store.values()) {
        if (!matchIds(filter, r)) continue;
        if (update.$set) Object.assign(r, update.$set);
        if (update.$inc) for (const [k, v] of Object.entries(update.$inc)) (r as any)[k] += v as number;
        return { ...r };
      }
      return null;
    },
    findOne: async (filter: any) => {
      for (const r of store.values()) if (matchIds(filter, r)) return { ...r };
      return null;
    },
  } as unknown as Collection<Locked & BaseDocument>;
};

describe('optimistic locking (@Version)', () => {
  it('increments version on a matching save', async () => {
    const id = new ObjectId();
    const col = createCollection([{ _id: id, id: id.toHexString(), name: 'a', version: 3 }]);
    const repo = new MongoRepository<Locked>(col, getDocumentMetadata(Locked));

    const saved = await repo.save({ id: id.toHexString(), name: 'b', version: 3 } as never);
    expect(saved.name).toBe('b');
    expect((saved as unknown as Locked).version).toBe(4);
  });

  it('throws OptimisticLockException when the version has moved on', async () => {
    const id = new ObjectId();
    const col = createCollection([{ _id: id, id: id.toHexString(), name: 'a', version: 5 }]);
    const repo = new MongoRepository<Locked>(col, getDocumentMetadata(Locked));

    // Caller thinks it's still version 3 → filter {version:3} matches nothing, doc exists.
    await expect(repo.save({ id: id.toHexString(), name: 'b', version: 3 } as never)).rejects.toBeInstanceOf(
      OptimisticLockException,
    );
  });

  it('defaults version to 0 on insert', async () => {
    const stored: Row[] = [];
    const col = {
      insertOne: async (doc: Row) => {
        stored.push(doc);
        return { insertedId: doc._id };
      },
    } as unknown as Collection<Locked & BaseDocument>;
    const repo = new MongoRepository<Locked>(col, getDocumentMetadata(Locked));
    await repo.insertOne({ name: 'fresh' } as never);
    expect(stored[0]!.version).toBe(0);
  });
});

describe('change streams', () => {
  it('watch() hydrates fullDocument and closes the stream', async () => {
    const id = new ObjectId();
    let closed = false;
    const events = [
      { operationType: 'insert', fullDocument: { _id: id, id: id.toHexString(), name: 'x', version: 0 } },
    ];
    const col = {
      watch: () => ({
        async *[Symbol.asyncIterator]() {
          for (const e of events) yield e;
        },
        close: async () => {
          closed = true;
        },
      }),
    } as unknown as Collection<Locked & BaseDocument>;

    const repo = new MongoRepository<Locked>(col, getDocumentMetadata(Locked));
    const seen: unknown[] = [];
    for await (const change of repo.watch()) {
      seen.push((change as any).fullDocument);
    }
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBeInstanceOf(Locked);
    expect(closed).toBe(true);
  });
});
