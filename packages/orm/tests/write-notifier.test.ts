import { describe, expect, it } from 'bun:test';
import { ObjectId, type Collection } from 'mongodb';
import type { BaseDocument, DocumentMetadata } from '../src/interfaces/document';
import { MongoRepository } from '../src/repository/mongo-repository';
import { WriteNotifier, type EntityWriteEvent } from '../src/events/write-notifier';

interface TestEntity extends BaseDocument {
  _id?: string | ObjectId;
  name: string;
}

class TestDoc implements TestEntity {
  _id?: string | ObjectId;
  name!: string;
}

const metadata: DocumentMetadata = {
  target: TestDoc,
  collection: 'test',
  timestamps: true,
  softDelete: true,
  indexes: [],
};

const collectEvents = (notifier: WriteNotifier): EntityWriteEvent[] => {
  const events: EntityWriteEvent[] = [];
  notifier.onWrite((event) => {
    events.push(event);
  });
  return events;
};

describe('WriteNotifier', () => {
  it('emits an insert event with documents, ids, and session after insertOne', async () => {
    const session = { fake: true };
    const collection = {
      insertOne: async (doc: { _id: ObjectId }) => ({ insertedId: doc._id }),
    } as unknown as Collection<TestEntity & BaseDocument>;

    const notifier = new WriteNotifier('default');
    const events = collectEvents(notifier);
    const repository = new MongoRepository<TestEntity>(collection, metadata, notifier);

    const inserted = await repository.insertOne({ name: 'alpha' }, { session: session as never });

    expect(events).toHaveLength(1);
    const event = events[0]!;
    expect(event.connectionName).toBe('default');
    expect(event.collection).toBe('test');
    expect(event.target).toBe(TestDoc);
    expect(event.operation).toBe('insert');
    expect(event.ids).toEqual([inserted.id]);
    expect(event.count).toBe(1);
    expect(event.session).toBe(session as never);
    expect(event.timestamp).toBeInstanceOf(Date);
    expect((event.documents?.[0] as TestEntity).name).toBe('alpha');
  });

  it('emits an update event from save on an existing entity', async () => {
    const stringId = '507f1f77bcf86cd799439011';
    const stored: Record<string, unknown> = { _id: stringId, id: stringId, name: 'before' };
    const collection = {
      updateOne: async (_filter: unknown, update: { $set?: Record<string, unknown> }) => {
        Object.assign(stored, update.$set ?? {});
        return { matchedCount: 1, modifiedCount: 1 };
      },
      findOne: async () => ({ ...stored }),
    } as unknown as Collection<TestEntity & BaseDocument>;

    const notifier = new WriteNotifier('default');
    const events = collectEvents(notifier);
    const repository = new MongoRepository<TestEntity>(collection, metadata, notifier);

    await repository.save({ id: stringId, name: 'after' });

    expect(events).toHaveLength(1);
    expect(events[0]!.operation).toBe('update');
    expect(events[0]!.ids).toEqual([stringId]);
    expect((events[0]!.documents?.[0] as TestEntity).name).toBe('after');
  });

  it('emits delete with filter and count from deleteMany', async () => {
    const collection = {
      deleteMany: async () => ({ deletedCount: 2 }),
    } as unknown as Collection<TestEntity & BaseDocument>;

    const notifier = new WriteNotifier('default');
    const events = collectEvents(notifier);
    const repository = new MongoRepository<TestEntity>(collection, metadata, notifier);

    await repository.deleteMany({ name: 'gone' });

    expect(events).toHaveLength(1);
    expect(events[0]!.operation).toBe('delete');
    expect(events[0]!.filter).toEqual({ name: 'gone' });
    expect(events[0]!.count).toBe(2);
  });

  it('emits bulkUpsert with the input documents', async () => {
    const collection = {
      bulkWrite: async () => ({ matchedCount: 0, modifiedCount: 0, upsertedCount: 2 }),
    } as unknown as Collection<TestEntity & BaseDocument>;

    const notifier = new WriteNotifier('default');
    const events = collectEvents(notifier);
    const repository = new MongoRepository<TestEntity>(collection, metadata, notifier);

    await repository.bulkUpsert([{ name: 'a' }, { name: 'b' }], ['name']);

    expect(events).toHaveLength(1);
    expect(events[0]!.operation).toBe('bulkUpsert');
    expect(events[0]!.documents).toEqual([{ name: 'a' }, { name: 'b' }]);
    expect(events[0]!.count).toBe(2);
  });

  it('a throwing listener never fails the write and later listeners still run', async () => {
    const collection = {
      deleteMany: async () => ({ deletedCount: 1 }),
    } as unknown as Collection<TestEntity & BaseDocument>;

    const notifier = new WriteNotifier('default');
    let secondListenerRan = false;
    notifier.onWrite(() => {
      throw new Error('listener boom');
    });
    notifier.onWrite(() => {
      secondListenerRan = true;
    });
    const repository = new MongoRepository<TestEntity>(collection, metadata, notifier);

    const deleted = await repository.deleteMany({ name: 'x' });

    expect(deleted).toBe(1);
    expect(secondListenerRan).toBe(true);
  });

  it('unsubscribe stops further events', async () => {
    const collection = {
      deleteMany: async () => ({ deletedCount: 1 }),
    } as unknown as Collection<TestEntity & BaseDocument>;

    const notifier = new WriteNotifier('default');
    const events: EntityWriteEvent[] = [];
    const unsubscribe = notifier.onWrite((event) => {
      events.push(event);
    });
    const repository = new MongoRepository<TestEntity>(collection, metadata, notifier);

    await repository.deleteMany({ name: 'x' });
    unsubscribe();
    await repository.deleteMany({ name: 'y' });

    expect(events).toHaveLength(1);
    expect(notifier.hasListeners).toBe(false);
  });
});
