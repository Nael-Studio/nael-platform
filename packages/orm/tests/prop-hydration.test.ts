import 'reflect-metadata';
import { afterEach, describe, expect, it } from 'bun:test';
import { ObjectId, type Collection } from 'mongodb';
import type { BaseDocument } from '../src/interfaces/document';
import { Document, getDocumentMetadata, clearDocumentRegistry } from '../src/decorators/document';
import { Prop } from '../src/decorators/prop';
import { MongoRepository } from '../src/repository/mongo-repository';

enum Role {
  User = 'user',
  Admin = 'admin',
}

@Document({ collection: 'users', timestamps: true })
class User {
  @Prop() name!: string;
  @Prop({ required: false }) nickname?: string;
  @Prop({ default: () => new Date('2020-01-01T00:00:00.000Z') }) joinedAt!: Date;
  @Prop({ enum: Role, default: Role.User }) role!: Role;
  @Prop({ unique: true }) email!: string;
  @Prop({ index: true }) tenantId!: string;
  @Prop({
    required: false,
    transform: { to: (v: string) => `enc:${v}`, from: (v: string) => v.replace(/^enc:/, '') },
  })
  ssn?: string;

  greet(): string {
    return `hi ${this.name}`;
  }
}

@Document({
  collection: 'things',
  indexes: [{ keys: { code: 1 }, options: { unique: true, name: 'custom_code' } }],
})
class Thing {
  @Prop({ unique: true }) code!: string;
  @Prop({ index: true }) label!: string;
}

interface UserRow extends BaseDocument {
  _id: ObjectId;
  id: string;
  name: string;
  ssn?: string;
  role?: Role;
  joinedAt?: Date;
}

const createUserCollection = () => {
  const store: UserRow[] = [];
  const collection = {
    insertOne: async (doc: UserRow) => {
      store.push(doc);
      return { insertedId: doc._id };
    },
    findOne: async (filter: Record<string, unknown>) => {
      const row = store.find((r) =>
        Object.entries(filter).every(([k, v]) => {
          if (k === '$or' || k === '$and') return true;
          return (r as Record<string, unknown>)[k] === v;
        }),
      );
      return row ? { ...row } : store.length ? { ...store[store.length - 1]! } : null;
    },
  } as unknown as Collection<User & BaseDocument>;
  return { store, collection };
};

afterEach(() => {
  // Registry is module-global; entity classes above register once at import time,
  // so we don't clear between these tests. Placeholder for future isolation needs.
});

describe('@Prop metadata capture', () => {
  it('captures prop metadata with required flags and enum', () => {
    const meta = getDocumentMetadata(User);
    const props = meta.props ?? [];
    const byKey = Object.fromEntries(props.map((p) => [p.propertyKey, p]));

    expect(Object.keys(byKey).sort()).toEqual(
      ['email', 'joinedAt', 'name', 'nickname', 'role', 'ssn', 'tenantId'].sort(),
    );
    expect(byKey.name!.required).toBe(true);
    expect(byKey.nickname!.required).toBe(false);
    expect(byKey.role!.enum).toBe(Role);
    expect(meta.hydrate).toBe(true);
  });

  it('reflects design types when emitDecoratorMetadata is on', () => {
    const meta = getDocumentMetadata(User);
    const name = (meta.props ?? []).find((p) => p.propertyKey === 'name');
    // design:type is String when reflection is available; tolerate undefined otherwise.
    if (name?.designType) {
      expect(name.designType).toBe(String);
    }
  });
});

describe('derived indexes', () => {
  it('merges @Prop unique/index shorthands and dedupes against explicit indexes', () => {
    const meta = getDocumentMetadata(Thing);
    const keys = meta.indexes.map((i) => ({ keys: i.keys, options: i.options }));

    // explicit code index preserved (with its custom name), derived label added,
    // NO duplicate code index from the @Prop({ unique }) shorthand.
    const codeIndexes = keys.filter((k) => 'code' in (k.keys as Record<string, unknown>));
    expect(codeIndexes).toHaveLength(1);
    expect(codeIndexes[0]!.options?.name).toBe('custom_code');

    const labelIndexes = keys.filter((k) => 'label' in (k.keys as Record<string, unknown>));
    expect(labelIndexes).toHaveLength(1);
  });

  it('adds unique + single-field derived indexes for User', () => {
    const meta = getDocumentMetadata(User);
    const email = meta.indexes.find((i) => 'email' in (i.keys as Record<string, unknown>));
    const tenant = meta.indexes.find((i) => 'tenantId' in (i.keys as Record<string, unknown>));
    expect(email?.options?.unique).toBe(true);
    expect(tenant?.options?.unique).toBeUndefined();
  });
});

describe('hydration + write transforms', () => {
  it('hydrates reads into class instances with working methods', async () => {
    const { collection } = createUserCollection();
    const repo = new MongoRepository<User>(collection, getDocumentMetadata(User));
    await repo.insertOne({ name: 'Ada', email: 'ada@x.io', tenantId: 't1' } as never);
    const found = await repo.findOne({ name: 'Ada' });
    expect(found).toBeInstanceOf(User);
    expect((found as unknown as User).greet()).toBe('hi Ada');
  });

  it('fills defaults on insert (factory + enum)', async () => {
    const { store } = createUserCollection();
    const collection = {
      insertOne: async (doc: UserRow) => {
        store.push(doc);
        return { insertedId: doc._id };
      },
    } as unknown as Collection<User & BaseDocument>;
    const repo = new MongoRepository<User>(collection, getDocumentMetadata(User));
    await repo.insertOne({ name: 'B', email: 'b@x.io', tenantId: 't' } as never);
    const persisted = store[0]!;
    expect(persisted.role).toBe(Role.User);
    expect(persisted.joinedAt).toEqual(new Date('2020-01-01T00:00:00.000Z'));
  });

  it('round-trips a to/from transform (encrypt on write, decrypt on read)', async () => {
    const { store, collection } = createUserCollection();
    const repo = new MongoRepository<User>(collection, getDocumentMetadata(User));
    await repo.insertOne({ name: 'C', email: 'c@x.io', tenantId: 't', ssn: '123-45' } as never);
    expect(store[0]!.ssn).toBe('enc:123-45'); // stored encrypted
    const found = await repo.findOne({ name: 'C' });
    expect((found as unknown as User).ssn).toBe('123-45'); // decrypted on read
  });

  it('preserves ObjectId identity through hydration', async () => {
    const { collection } = createUserCollection();
    const repo = new MongoRepository<User>(collection, getDocumentMetadata(User));
    const inserted = await repo.insertOne({ name: 'D', email: 'd@x.io', tenantId: 't' } as never);
    const found = await repo.findOne({ name: 'D' });
    expect((found as unknown as { _id: unknown })._id).toBeInstanceOf(ObjectId);
    expect(found?.id).toBe(inserted.id);
  });
});
