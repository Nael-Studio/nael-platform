import { describe, expect, it } from 'bun:test';
import { ObjectId, type Collection } from 'mongodb';
import { InMemoryCacheStore } from '@nl-framework/core';
import type { BaseDocument, DocumentMetadata } from '../src/interfaces/document';
import { MongoRepository } from '../src/repository/mongo-repository';
import { WriteNotifier } from '../src/events/write-notifier';

class Thing {
  name!: string;
}

const metadata: DocumentMetadata = {
  target: Thing,
  collection: 'things',
  timestamps: false,
  softDelete: false,
  indexes: [],
};

const createCollection = () => {
  let findCalls = 0;
  const rows = [{ _id: new ObjectId(), id: 'x', name: 'a' }];
  const collection = {
    find: () => {
      findCalls += 1;
      return { toArray: async () => rows.map((r) => ({ ...r })) };
    },
    insertOne: async (doc: { _id: ObjectId }) => ({ insertedId: doc._id }),
  } as unknown as Collection<Thing & BaseDocument>;
  return { collection, calls: () => findCalls };
};

describe('read-through query cache', () => {
  it('misses then hits — the second call does not touch the collection', async () => {
    const { collection, calls } = createCollection();
    const cache = new InMemoryCacheStore();
    const repo = new MongoRepository<Thing>(collection, metadata, new WriteNotifier('default'), { cache });

    await repo.find({ name: 'a' }, { cache: { ttlMs: 1000 } });
    await repo.find({ name: 'a' }, { cache: { ttlMs: 1000 } });
    expect(calls()).toBe(1); // second served from cache
  });

  it('a write to the collection invalidates cached entries', async () => {
    const { collection, calls } = createCollection();
    const cache = new InMemoryCacheStore();
    const notifier = new WriteNotifier('default');
    const repo = new MongoRepository<Thing>(collection, metadata, notifier, { cache });

    await repo.find({ name: 'a' }, { cache: { ttlMs: 1000 } });
    expect(calls()).toBe(1);

    await repo.insertOne({ name: 'b' } as never); // emits a write on 'things'
    await repo.find({ name: 'a' }, { cache: { ttlMs: 1000 } });
    expect(calls()).toBe(2); // cache was invalidated, so this hit the collection
  });

  it('never caches inside a transaction (session present)', async () => {
    const { collection, calls } = createCollection();
    const cache = new InMemoryCacheStore();
    const repo = new MongoRepository<Thing>(collection, metadata, new WriteNotifier('default'), { cache });

    const session = {} as never;
    await repo.find({ name: 'a' }, { cache: { ttlMs: 1000 }, session });
    await repo.find({ name: 'a' }, { cache: { ttlMs: 1000 }, session });
    expect(calls()).toBe(2); // no caching under a session
  });

  it('does not cache when no cache directive is passed', async () => {
    const { collection, calls } = createCollection();
    const cache = new InMemoryCacheStore();
    const repo = new MongoRepository<Thing>(collection, metadata, new WriteNotifier('default'), { cache });

    await repo.find({ name: 'a' });
    await repo.find({ name: 'a' });
    expect(calls()).toBe(2);
  });
});
