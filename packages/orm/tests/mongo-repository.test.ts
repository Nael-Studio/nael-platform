import { describe, expect, it } from 'bun:test';
import { ObjectId, type Collection, type Filter, type MatchKeysAndValues, type UpdateFilter } from 'mongodb';
import type { BaseDocument, DocumentMetadata } from '../src/interfaces/document';
import { MongoRepository } from '../src/repository/mongo-repository';

interface TestEntity extends BaseDocument {
  _id?: string | ObjectId;
  name: string;
  nickname?: string;
}

class TestDoc implements TestEntity {
  _id?: string | ObjectId;
  name!: string;
  nickname?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

type StoredEntity = TestEntity & { _id: string | ObjectId; id: string; name: string };

type FakeCollection = {
  findOne: (filter: Filter<TestEntity & BaseDocument>) => Promise<(TestEntity & BaseDocument) | null>;
  updateOne: (
    filter: Filter<TestEntity & BaseDocument>,
    update: UpdateFilter<TestEntity & BaseDocument>,
  ) => Promise<{ matchedCount: number; modifiedCount: number }>;
};

const matchesId = (condition: unknown, value: unknown): boolean => {
  if (condition instanceof ObjectId) {
    if (value instanceof ObjectId) {
      return value.equals(condition);
    }
    if (typeof value === 'string' && ObjectId.isValid(value)) {
      return new ObjectId(value).equals(condition);
    }
    return false;
  }

  if (condition && typeof condition === 'object' && '$in' in (condition as Record<string, unknown>)) {
    const { $in } = condition as { $in: unknown[] };
    return $in.some((item) => matchesId(item, value));
  }

  return condition === value;
};

const matchesValue = (condition: unknown, value: unknown): boolean => {
  if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
    const cond = condition as Record<string, unknown>;
    if ('$exists' in cond) {
      const expected = Boolean(cond.$exists);
      return expected ? value !== undefined : value === undefined;
    }
    if ('$in' in cond && Array.isArray(cond.$in)) {
      return cond.$in.some((item) => matchesValue(item, value));
    }
  }

  return condition === value;
};

const matchesFilter = (filter: Filter<TestEntity & BaseDocument>, doc: StoredEntity): boolean => {
  if (!filter || Object.keys(filter).length === 0) {
    return true;
  }

  if ('$and' in filter) {
    const clauses = (filter as { $and: Array<Filter<TestEntity & BaseDocument>> }).$and;
    return clauses.every((clause) => matchesFilter(clause, doc));
  }

  if ('$or' in filter) {
    const clauses = (filter as { $or: Array<Filter<TestEntity & BaseDocument>> }).$or;
    return clauses.some((clause) => matchesFilter(clause, doc));
  }

  for (const [key, condition] of Object.entries(filter)) {
    if (key === '_id') {
      if (!matchesId(condition, doc._id)) {
        return false;
      }
      continue;
    }

    if (key === 'id') {
      if (!matchesId(condition, doc.id)) {
        return false;
      }
      continue;
    }

    if (!matchesValue(condition, (doc as unknown as Record<string, unknown>)[key])) {
      return false;
    }
  }

  return true;
};

const createCollection = (store: Map<string | ObjectId, StoredEntity>): FakeCollection => ({
  findOne: async (filter) => {
    for (const entity of store.values()) {
      if (matchesFilter(filter as Filter<TestEntity & BaseDocument>, entity)) {
        return { ...entity } as TestEntity & BaseDocument;
      }
    }
    return null;
  },
  updateOne: async (filter, update) => {
    for (const [key, entity] of store.entries()) {
      if (!matchesFilter(filter as Filter<TestEntity & BaseDocument>, entity)) {
        continue;
      }

      const next: StoredEntity = { ...entity };

      if (update.$set) {
        Object.assign(next, update.$set as MatchKeysAndValues<TestEntity & BaseDocument>);
      }

      if (update.$unset) {
        for (const unsetKey of Object.keys(update.$unset as Record<string, unknown>)) {
          delete (next as unknown as Record<string, unknown>)[unsetKey];
        }
      }

      store.set(key, next);
      return {
        matchedCount: 1,
        modifiedCount: 1,
      };
    }

    return {
      matchedCount: 0,
      modifiedCount: 0,
    };
  },
});

describe('MongoRepository', () => {
  it('loads updated entity when stored _id is a string matching an ObjectId pattern', async () => {
    const metadata: DocumentMetadata = {
      target: TestDoc,
      collection: 'test',
      timestamps: true,
      softDelete: true,
      indexes: [],
    };

    const now = new Date();
    const stringId = '507f1f77bcf86cd799439011';

    const store = new Map<string | ObjectId, StoredEntity>([
      [
        stringId,
        {
          _id: stringId,
          id: stringId,
          name: 'Initial',
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      ],
    ]);

    const collection = createCollection(store) as unknown as Collection<TestEntity & BaseDocument>;
    const repository = new MongoRepository<TestEntity>(collection, metadata);

    const updated = await repository.save({ id: stringId, name: 'Updated' });

    expect(updated).not.toBeNull();
    expect(updated?.id).toBe(stringId);
    expect(updated?._id).toBe(stringId);
    expect(updated?.name).toBe('Updated');
    expect(store.get(stringId)?.name).toBe('Updated');
  });

  it('updates using _id when id is missing on the input entity', async () => {
    const metadata: DocumentMetadata = {
      target: TestDoc,
      collection: 'test',
      timestamps: true,
      softDelete: false,
      indexes: [],
    };

    const objectId = new ObjectId();
    const store = new Map<string | ObjectId, StoredEntity>([
      [
        objectId,
        {
          _id: objectId,
          id: objectId.toHexString(),
          name: 'Initial name',
        },
      ],
    ]);

    const collection = createCollection(store) as unknown as Collection<TestEntity & BaseDocument>;
    const repository = new MongoRepository<TestEntity>(collection, metadata);

    const updated = await repository.save({ _id: objectId, name: 'Updated name' });

    expect(updated).not.toBeNull();
    expect(updated?.id).toBe(objectId.toHexString());
    expect(updated?._id instanceof ObjectId).toBe(true);
    expect(updated?.name).toBe('Updated name');
    expect(store.get(objectId)?.name).toBe('Updated name');
  });

  it('finds by id when persisted value is an ObjectId but caller passes hex string', async () => {
    const metadata: DocumentMetadata = {
      target: TestDoc,
      collection: 'test',
      timestamps: false,
      softDelete: false,
      indexes: [],
    };

    const objectId = new ObjectId();
    const store = new Map<string | ObjectId, StoredEntity>([
      [
        objectId,
        {
          _id: objectId,
          id: objectId.toHexString(),
          name: 'Stored',
        },
      ],
    ]);

    const collection = createCollection(store) as unknown as Collection<TestEntity & BaseDocument>;
    const repository = new MongoRepository<TestEntity>(collection, metadata);

    const entity = await repository.findById(objectId.toHexString());

    expect(entity).not.toBeNull();
    expect(entity?.id).toBe(objectId.toHexString());
    expect(entity?._id instanceof ObjectId).toBe(true);
    expect(entity?.name).toBe('Stored');
  });

  it('deleteMany hard-deletes matching documents regardless of soft-delete settings', async () => {
    const metadata: DocumentMetadata = {
      target: TestDoc,
      collection: 'test',
      timestamps: true,
      softDelete: true,
      indexes: [],
    };

    const received: { filter?: unknown; options?: unknown } = {};
    const collection = {
      deleteMany: async (filter: unknown, options: unknown) => {
        received.filter = filter;
        received.options = options;
        return { deletedCount: 3 };
      },
    } as unknown as Collection<TestEntity & BaseDocument>;

    const repository = new MongoRepository<TestEntity>(collection, metadata);
    const session = { fake: true };
    const deleted = await repository.deleteMany(
      { name: 'gone' },
      { session: session as never },
    );

    expect(deleted).toBe(3);
    expect(received.filter).toEqual({ name: 'gone' });
    expect((received.options as { session?: unknown }).session).toBe(session);
  });

  it('bulkUpsert builds keyed upserts with timestamp handling', async () => {
    const metadata: DocumentMetadata = {
      target: TestDoc,
      collection: 'test',
      timestamps: true,
      softDelete: true,
      indexes: [],
    };

    let receivedOps: Array<Record<string, any>> = [];
    const collection = {
      bulkWrite: async (operations: Array<Record<string, any>>) => {
        receivedOps = operations;
        return { matchedCount: 1, modifiedCount: 1, upsertedCount: 1 };
      },
    } as unknown as Collection<TestEntity & BaseDocument>;

    const repository = new MongoRepository<TestEntity>(collection, metadata);
    const result = await repository.bulkUpsert(
      [
        { name: 'alpha', nickname: 'a' },
        { name: 'beta', nickname: 'b' },
      ],
      ['name'],
    );

    expect(result).toEqual({ matchedCount: 1, modifiedCount: 1, upsertedCount: 1 });
    expect(receivedOps).toHaveLength(2);

    const first = receivedOps[0]!.updateOne;
    expect(first.filter).toEqual({ name: 'alpha' });
    expect(first.upsert).toBe(true);
    expect(first.update.$set.nickname).toBe('a');
    expect(first.update.$set.updatedAt).toBeInstanceOf(Date);
    expect(first.update.$set.createdAt).toBeUndefined();
    expect(first.update.$setOnInsert.createdAt).toBeInstanceOf(Date);
    expect(first.update.$setOnInsert.deletedAt).toBeNull();
  });

  it('bulkUpsert short-circuits on empty input and rejects empty keys', async () => {
    const metadata: DocumentMetadata = {
      target: TestDoc,
      collection: 'test',
      timestamps: true,
      softDelete: true,
      indexes: [],
    };

    let called = false;
    const collection = {
      bulkWrite: async () => {
        called = true;
        return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
      },
    } as unknown as Collection<TestEntity & BaseDocument>;

    const repository = new MongoRepository<TestEntity>(collection, metadata);

    const empty = await repository.bulkUpsert([], ['name']);
    expect(empty).toEqual({ matchedCount: 0, modifiedCount: 0, upsertedCount: 0 });
    expect(called).toBe(false);

    expect(repository.bulkUpsert([{ name: 'x' }], [])).rejects.toThrow(
      'bulkUpsert requires at least one key field',
    );
  });
});
