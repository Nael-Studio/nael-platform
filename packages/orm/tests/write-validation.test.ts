import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { ObjectId, type Collection } from 'mongodb';
import { IsInt, IsString, Min } from 'class-validator';
import { ValidationException } from '@nl-framework/core';
import type { BaseDocument } from '../src/interfaces/document';
import { Document, getDocumentMetadata } from '../src/decorators/document';
import { Prop } from '../src/decorators/prop';
import { MongoRepository } from '../src/repository/mongo-repository';

@Document({ collection: 'accounts', validate: true, timestamps: false, softDelete: false })
class Account {
  @Prop() @IsString() name!: string;
  @Prop() @IsInt() @Min(0) balance!: number;
}

@Document({ collection: 'loose', timestamps: false, softDelete: false })
class Loose {
  @Prop() @IsInt() @Min(0) balance!: number;
}

const insertOnlyCollection = () => {
  const store: unknown[] = [];
  const collection = {
    insertOne: async (doc: { _id: ObjectId }) => {
      store.push(doc);
      return { insertedId: doc._id };
    },
  } as unknown as Collection<never & BaseDocument>;
  return { store, collection };
};

describe('validation on write', () => {
  it('passes a valid document through to the driver', async () => {
    const { store, collection } = insertOnlyCollection();
    const repo = new MongoRepository<Account>(
      collection as never,
      getDocumentMetadata(Account),
    );
    await repo.insertOne({ name: 'ok', balance: 10 } as never);
    expect(store).toHaveLength(1);
  });

  it('throws ValidationException with issue shape on invalid input', async () => {
    const { collection } = insertOnlyCollection();
    const repo = new MongoRepository<Account>(
      collection as never,
      getDocumentMetadata(Account),
    );

    let error: unknown;
    try {
      await repo.insertOne({ name: 'bad', balance: -5 } as never);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ValidationException);
    const issues = (error as ValidationException).issues;
    expect(issues.some((i) => i.property === 'balance')).toBe(true);
    expect(issues[0]!.constraints.length).toBeGreaterThan(0);
  });

  it('does not run validation when validate is off (default)', async () => {
    const { store, collection } = insertOnlyCollection();
    const repo = new MongoRepository<Loose>(collection as never, getDocumentMetadata(Loose));
    // balance -5 would fail @Min(0), but validate is off so it persists.
    await repo.insertOne({ balance: -5 } as never);
    expect(store).toHaveLength(1);
  });

  it('validates each document in insertMany', async () => {
    const inserted: unknown[] = [];
    const collection = {
      insertMany: async (docs: Array<{ _id: ObjectId }>) => {
        inserted.push(...docs);
        return { insertedIds: docs.map((d) => d._id) };
      },
    } as unknown as Collection<never & BaseDocument>;
    const repo = new MongoRepository<Account>(collection as never, getDocumentMetadata(Account));
    await expect(
      repo.insertMany([{ name: 'a', balance: 1 }, { name: 'b', balance: -1 }] as never),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(inserted).toHaveLength(0); // rejected before touching the driver
  });
});
