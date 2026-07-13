import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { ObjectId, type Collection } from 'mongodb';
import type { BaseDocument } from '../src/interfaces/document';
import { Document, getDocumentMetadata } from '../src/decorators/document';
import { Prop } from '../src/decorators/prop';
import {
  AfterInsert,
  AfterUpdate,
  BeforeInsert,
  BeforeUpdate,
} from '../src/decorators/hooks';
import { MongoRepository } from '../src/repository/mongo-repository';

const order: string[] = [];

@Document({ collection: 'hooked', timestamps: false, softDelete: false, validate: true })
class Hooked {
  @Prop() name!: string;
  @Prop({ required: false }) slug?: string;
  @Prop({ required: false }) afterInsertSeen?: boolean;

  @BeforeInsert()
  makeSlug(): void {
    order.push('beforeInsert');
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-');
  }

  @AfterInsert()
  markInserted(): void {
    order.push('afterInsert');
  }

  @BeforeUpdate()
  touch(): void {
    order.push('beforeUpdate');
    this.slug = `${this.name.toLowerCase()}-updated`;
  }

  @AfterUpdate()
  markUpdated(): void {
    order.push('afterUpdate');
  }
}

interface Row extends BaseDocument {
  _id: ObjectId;
  id: string;
  name: string;
  slug?: string;
}

const createCollection = () => {
  const store: Row[] = [];
  const collection = {
    insertOne: async (doc: Row) => {
      order.push('write');
      store.push(doc);
      return { insertedId: doc._id };
    },
    findOneAndUpdate: async (_filter: unknown, update: { $set?: Record<string, unknown> }) => {
      order.push('write');
      const row = store[0]!;
      Object.assign(row, update.$set ?? {});
      return { ...row };
    },
  } as unknown as Collection<Hooked & BaseDocument>;
  return { store, collection };
};

describe('entity lifecycle hooks', () => {
  it('runs before-insert (mutating), then validate, write, after-insert, notifier in order', async () => {
    order.length = 0;
    const { store, collection } = createCollection();
    const repo = new MongoRepository<Hooked>(collection, getDocumentMetadata(Hooked));
    const inserted = await repo.insertOne({ name: 'Hello World' } as never);

    // Mutation from before-insert is persisted.
    expect(store[0]!.slug).toBe('hello-world');
    expect(inserted.slug).toBe('hello-world');
    // Ordering: hooks -> write -> after-hooks.
    expect(order).toEqual(['beforeInsert', 'write', 'afterInsert']);
  });

  it('runs before/after update hooks around save()', async () => {
    order.length = 0;
    const { store, collection } = createCollection();
    store.push({ _id: new ObjectId(), id: new ObjectId().toHexString(), name: 'Init' });
    const repo = new MongoRepository<Hooked>(collection, getDocumentMetadata(Hooked));

    const updated = await repo.save({ id: store[0]!.id, name: 'Renamed' } as never);
    expect(updated.slug).toBe('renamed-updated');
    expect(order).toEqual(['beforeUpdate', 'write', 'afterUpdate']);
  });

  it('does not run per-entity hooks on bulk paths (updateMany)', async () => {
    order.length = 0;
    const collection = {
      updateMany: async () => ({ matchedCount: 1, modifiedCount: 1 }),
    } as unknown as Collection<Hooked & BaseDocument>;
    const repo = new MongoRepository<Hooked>(collection, getDocumentMetadata(Hooked));
    await repo.updateMany({ name: 'x' } as never, { name: 'y' } as never);
    expect(order).toEqual([]);
  });

  it('a throwing before-hook aborts the write', async () => {
    order.length = 0;

    @Document({ collection: 'boom', timestamps: false, softDelete: false })
    class Boom {
      @Prop() name!: string;
      @BeforeInsert()
      fail(): void {
        throw new Error('nope');
      }
    }

    let written = false;
    const collection = {
      insertOne: async () => {
        written = true;
        return { insertedId: new ObjectId() };
      },
    } as unknown as Collection<Boom & BaseDocument>;
    const repo = new MongoRepository<Boom>(collection, getDocumentMetadata(Boom));
    await expect(repo.insertOne({ name: 'a' } as never)).rejects.toThrow('nope');
    expect(written).toBe(false);
  });
});
