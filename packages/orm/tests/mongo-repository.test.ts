import { describe, expect, it } from 'bun:test';
import { ObjectId, type Collection, type Filter, type MatchKeysAndValues, type UpdateFilter } from 'mongodb';
import type { BaseDocument, DocumentMetadata } from '../src/interfaces/document';
import { MongoRepository } from '../src/repository/mongo-repository';

interface TestEntity extends BaseDocument {
  _id?: string | ObjectId;
  name: string;
  nickname?: string;
  [key: string]: unknown;
}

class TestDoc implements TestEntity {
  [key: string]: unknown;
  _id?: string | ObjectId;
  name!: string;
  nickname?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

type StoredEntity = TestEntity & { _id: string | ObjectId; name: string };

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

const matchesFilter = (filter: Filter<TestEntity & BaseDocument>, doc: StoredEntity): boolean => {
  if (!filter || Object.keys(filter).length === 0) {
    return true;
  }

  if ('$and' in filter) {
    const clauses = (filter as { $and: Array<Filter<TestEntity & BaseDocument>> }).$and;
    return clauses.every((clause) => matchesFilter(clause, doc));
  }

  if ('_id' in filter) {
    return matchesId((filter as { _id: unknown })._id, doc._id);
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
    };

    const now = new Date();
    const stringId = '507f1f77bcf86cd799439011';

    const store = new Map<string | ObjectId, StoredEntity>([
      [
        stringId,
        {
          _id: stringId,
          name: 'Initial',
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      ],
    ]);

    const collection = createCollection(store) as unknown as Collection<TestEntity & BaseDocument>;
    const repository = new MongoRepository<TestEntity>(collection, metadata);

    const updated = await repository.save({ _id: stringId, name: 'Updated' });

    expect(updated).not.toBeNull();
    expect(updated?._id).toBe(stringId);
    expect(updated?.name).toBe('Updated');
    expect(store.get(stringId)?.name).toBe('Updated');
  });

  it('finds by id when persisted value is an ObjectId but caller passes hex string', async () => {
    const metadata: DocumentMetadata = {
      target: TestDoc,
      collection: 'test',
      timestamps: false,
      softDelete: false,
    };

    const objectId = new ObjectId();
    const store = new Map<string | ObjectId, StoredEntity>([
      [
        objectId,
        {
          _id: objectId,
          name: 'Stored',
        },
      ],
    ]);

    const collection = createCollection(store) as unknown as Collection<TestEntity & BaseDocument>;
    const repository = new MongoRepository<TestEntity>(collection, metadata);

    const entity = await repository.findById(objectId.toHexString());

    expect(entity).not.toBeNull();
    expect(entity?._id instanceof ObjectId).toBe(true);
    expect(entity?.name).toBe('Stored');
  });
});
