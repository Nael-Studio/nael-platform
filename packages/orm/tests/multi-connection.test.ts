import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { ObjectId, type Collection } from 'mongodb';
import type { BaseDocument, DocumentMetadata } from '../src/interfaces/document';
import { getRepositoryToken, DEFAULT_CONNECTION_NAME } from '../src/constants';
import { InjectRepository } from '../src/decorators/inject-repository';
import { OrmModule } from '../src/module';
import { MongoRepository } from '../src/repository/mongo-repository';

class Account {
  balance!: number;
}

const metadata: DocumentMetadata = {
  target: Account,
  collection: 'accounts',
  timestamps: false,
  softDelete: false,
  indexes: [],
};

// Independent in-memory collections stand in for two physical connections.
const createCollection = () => {
  const store: Record<string, unknown>[] = [];
  return {
    insertOne: async (doc: { _id: ObjectId }) => {
      store.push(doc);
      return { insertedId: doc._id };
    },
    find: () => ({ toArray: async () => store.map((r) => ({ ...r })) }),
    store,
  } as unknown as Collection<Account & BaseDocument> & { store: Record<string, unknown>[] };
};

describe('named multi-connections', () => {
  it('produces distinct repository tokens per connection, default backward compatible', () => {
    const defaultToken = getRepositoryToken(Account);
    const namedToken = getRepositoryToken(Account, 'analytics');
    expect(namedToken).not.toBe(defaultToken);
    // Passing the default name explicitly resolves to the same token.
    expect(getRepositoryToken(Account, DEFAULT_CONNECTION_NAME)).toBe(defaultToken);
  });

  it('isolates the same entity class across two connections', async () => {
    const primary = createCollection();
    const analytics = createCollection();
    const primaryRepo = new MongoRepository<Account>(primary, metadata);
    const analyticsRepo = new MongoRepository<Account>(analytics, metadata);

    await primaryRepo.insertOne({ balance: 100 } as never);

    expect(await primaryRepo.find()).toHaveLength(1);
    expect(await analyticsRepo.find()).toHaveLength(0); // fully isolated
  });

  it('InjectRepository builds a parameter decorator without throwing', () => {
    expect(() => {
      class Service {
        constructor(@InjectRepository(Account, 'analytics') readonly repo: unknown) {}
      }
      return new Service({});
    }).not.toThrow();
  });

  it('forFeature accepts a positional connection name', () => {
    const moduleClass = OrmModule.forFeature([Account], 'analytics');
    expect(typeof moduleClass).toBe('function');
  });
});
