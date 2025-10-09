import type {
  Collection,
  Filter,
  FindOptions,
  MatchKeysAndValues,
  OptionalUnlessRequiredId,
  UpdateFilter,
  WithId,
} from 'mongodb';
import { ObjectId } from 'mongodb';
import type { DocumentMetadata, BaseDocument, DocumentClass } from '../interfaces/document';
import { OrmRepository, type OrmEntityDocument } from '../interfaces/repository';

export interface FindManyOptions<T> extends FindOptions<T & BaseDocument> {
  withDeleted?: boolean;
}

export interface FindOneOptions<T> extends FindManyOptions<T> {}

const buildNotDeletedFilter = <T>(): Filter<T & BaseDocument> =>
  ({
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  }) as Filter<T & BaseDocument>;

export class MongoRepository<T extends object> extends OrmRepository<
  T,
  Filter<T>,
  FindManyOptions<T>,
  FindOneOptions<T>,
  OptionalUnlessRequiredId<T>,
  Partial<T>,
  OrmEntityDocument<T>
> {
  constructor(
    private readonly collection: Collection<T & BaseDocument>,
    private readonly metadata: DocumentMetadata,
  ) {
    super();
  }

  get collectionName(): string {
    return this.metadata.collection;
  }

  get entity(): DocumentClass<T> {
    return this.metadata.target as DocumentClass<T>;
  }

  async find(filter: Filter<T> = {}, options: FindManyOptions<T> = {}): Promise<Array<OrmEntityDocument<T>>> {
    const { withDeleted, ...mongoOptions } = options;
    const cursor = this.collection.find(this.applyFilter(filter, withDeleted), mongoOptions);
    const results = await cursor.toArray();
  return results.map((doc) => this.mapDocument(doc as WithId<T & BaseDocument>));
  }

  async findOne(
    filter: Filter<T> = {},
    options: FindOneOptions<T> = {},
  ): Promise<OrmEntityDocument<T> | null> {
    const { withDeleted, ...mongoOptions } = options;
    const document = (await this.collection.findOne(
      this.applyFilter(filter, withDeleted),
      mongoOptions,
    )) as (WithId<T & BaseDocument> & { id?: string }) | null;
    return document ? this.mapDocument(document) : null;
  }

  async findById(id: string | ObjectId, options: FindOneOptions<T> = {}): Promise<OrmEntityDocument<T> | null> {
    return this.findOne(this.buildIdFilter(id), options);
  }

  async count(filter: Filter<T> = {}, options: FindManyOptions<T> = {}): Promise<number> {
    const { withDeleted, ...mongoOptions } = options;
    return this.collection.countDocuments(this.applyFilter(filter, withDeleted), mongoOptions);
  }

  async insertOne(doc: OptionalUnlessRequiredId<T>): Promise<OrmEntityDocument<T>> {
    const prepared = this.prepareForInsert(doc);
    const result = await this.collection.insertOne(prepared);
    const persisted = {
      ...prepared,
      _id: prepared._id ?? result.insertedId,
    } as WithId<T & BaseDocument>;
    return this.mapDocument(persisted);
  }

  async insertMany(docs: OptionalUnlessRequiredId<T>[]): Promise<Array<OrmEntityDocument<T>>> {
    const prepared = docs.map((doc) => this.prepareForInsert(doc));
    const result = await this.collection.insertMany(prepared);
    return prepared.map((doc, index) =>
      this.mapDocument({
        ...doc,
        _id: doc._id ?? result.insertedIds[index]!,
      } as WithId<T & BaseDocument>),
    );
  }

  async save(entity: Partial<T> & { id?: string; _id?: string | ObjectId }): Promise<OrmEntityDocument<T>> {
    const identifier = entity.id ?? entity._id;

    if (identifier) {
      const { _id, id, ...rest } = entity;
      const update = this.prepareForUpdate(rest as Partial<T>);
      const filter = this.buildIdFilter(identifier as string | ObjectId);
      await this.collection.updateOne(filter as Filter<T & BaseDocument>, update);
      const updated = await this.findOne(filter, { withDeleted: true });
      if (!updated) {
        throw new Error('Failed to load entity after update');
      }
      return updated;
    }

    return this.insertOne(entity as OptionalUnlessRequiredId<T>);
  }

  async updateMany(filter: Filter<T>, update: Partial<T>): Promise<number> {
    const result = await this.collection.updateMany(
      this.applyFilter(filter, true),
      this.prepareForUpdate(update),
    );
    return result.modifiedCount;
  }

  async softDelete(filter: Filter<T>): Promise<number> {
    if (!this.metadata.softDelete) {
      const result = await this.collection.deleteMany(filter as Filter<T & BaseDocument>);
      return result.deletedCount ?? 0;
    }

    const now = new Date();
    const update: UpdateFilter<T & BaseDocument> = {
      $set: { deletedAt: now } as MatchKeysAndValues<T & BaseDocument>,
    };

    if (this.metadata.timestamps) {
      update.$currentDate = {
        updatedAt: true,
      } as unknown as MatchKeysAndValues<T & BaseDocument>;
    }

    const result = await this.collection.updateMany(this.applyFilter(filter, true), update);
    return result.modifiedCount;
  }

  async restore(filter: Filter<T>): Promise<number> {
    if (!this.metadata.softDelete) {
      return 0;
    }

    const update: UpdateFilter<T & BaseDocument> = {
      $set: { deletedAt: null } as MatchKeysAndValues<T & BaseDocument>,
    };

    if (this.metadata.timestamps) {
      update.$currentDate = {
        updatedAt: true,
      } as unknown as MatchKeysAndValues<T & BaseDocument>;
    }

    const result = await this.collection.updateMany(this.applyFilter(filter, true), update);

    return result.modifiedCount;
  }

  async deleteHard(filter: Filter<T>): Promise<number> {
    const result = await this.collection.deleteMany(filter as Filter<T & BaseDocument>);
    return result.deletedCount ?? 0;
  }

  private applyFilter(filter: Filter<T>, withDeleted?: boolean): Filter<T & BaseDocument> {
    const base = (filter ?? {}) as Filter<T & BaseDocument>;

    if (!this.metadata.softDelete || withDeleted) {
      return base;
    }

    const notDeleted = buildNotDeletedFilter<T>();

    if (!filter || Object.keys(filter).length === 0) {
      return notDeleted;
    }

    return {
      $and: [base, notDeleted],
    } as Filter<T & BaseDocument>;
  }

  private prepareForInsert(doc: OptionalUnlessRequiredId<T>): OptionalUnlessRequiredId<T & BaseDocument> {
    const now = new Date();
  const prepared: Record<string, unknown> = { ...(doc as Record<string, unknown>) };

    this.ensureIdentifiers(prepared);

    if (this.metadata.timestamps) {
      prepared.createdAt ??= now;
      prepared.updatedAt ??= now;
    }

    if (this.metadata.softDelete) {
      prepared.deletedAt ??= null;
    }

    return prepared as OptionalUnlessRequiredId<T & BaseDocument>;
  }

  private prepareForUpdate(update: Partial<T>): UpdateFilter<T & BaseDocument> {
  const prepared: Record<string, unknown> = { ...(update as Record<string, unknown>) };

    if (this.metadata.timestamps) {
      prepared.updatedAt = new Date();
      delete prepared.createdAt;
    }

    const set: Record<string, unknown> = {};
    const unset: Record<string, true> = {};

    for (const [key, value] of Object.entries(prepared)) {
      if (key === '_id' || key === 'id') {
        continue;
      }

      if (value === undefined) {
        unset[key] = true;
      } else {
        set[key] = value;
      }
    }

    const updateFilter: UpdateFilter<T & BaseDocument> = {};

    if (Object.keys(set).length) {
      updateFilter.$set = set as MatchKeysAndValues<T & BaseDocument>;
    }

    if (Object.keys(unset).length) {
      updateFilter.$unset = unset as unknown as MatchKeysAndValues<T & BaseDocument>;
    }

    return updateFilter;
  }

  private ensureIdentifiers(target: Record<string, unknown>): void {
    const hasId = typeof target.id === 'string' && target.id.length > 0;
    const mongoId = target._id as unknown;
    const hasMongoId = mongoId !== undefined && mongoId !== null;

    if (hasId) {
      if (!hasMongoId) {
        const stringId = target.id as string;
        target._id = ObjectId.isValid(stringId) ? new ObjectId(stringId) : stringId;
      } else if (mongoId instanceof ObjectId) {
        target.id = mongoId.toHexString();
      } else if (typeof mongoId === 'string') {
        target.id = mongoId;
      } else {
        target.id = this.normalizeIdValue(mongoId);
      }
      return;
    }

    if (hasMongoId) {
      if (mongoId instanceof ObjectId) {
        target.id = mongoId.toHexString();
      } else if (typeof mongoId === 'string') {
        target.id = mongoId;
        if (ObjectId.isValid(mongoId)) {
          target._id = new ObjectId(mongoId);
        }
      } else {
        target.id = this.normalizeIdValue(mongoId);
      }
      return;
    }

    const generated = new ObjectId();
    target._id = generated;
    target.id = generated.toHexString();
  }

  private normalizeIdValue(value: unknown): string {
    if (value instanceof ObjectId) {
      return value.toHexString();
    }

    if (typeof value === 'string') {
      return value;
    }

    if (value === null || value === undefined) {
      throw new Error('Unable to normalize empty identifier');
    }

    return String(value);
  }

  private mapDocument(doc: WithId<T & BaseDocument>): OrmEntityDocument<T> {
    const id = typeof (doc as Record<string, unknown>).id === 'string'
      ? ((doc as Record<string, unknown>).id as string)
      : this.normalizeIdValue(doc._id);

    return {
      ...(doc as object),
      id,
    } as OrmEntityDocument<T>;
  }

  private buildIdFilter(id: string | ObjectId): Filter<T> {
    const normalized = this.normalizeIdValue(id);

    const candidates: Array<Filter<T & BaseDocument>> = [
      { id: normalized } as Filter<T & BaseDocument>,
    ];

    if (id instanceof ObjectId) {
      candidates.push({ _id: id } as Filter<T & BaseDocument>);
      candidates.push({ _id: id.toHexString() } as Filter<T & BaseDocument>);
    } else {
      candidates.push({ _id: id } as Filter<T & BaseDocument>);
      if (ObjectId.isValid(id)) {
        candidates.push({ _id: new ObjectId(id) } as Filter<T & BaseDocument>);
      }
    }

    return candidates.length === 1
      ? (candidates[0] as Filter<T>)
      : ({ $or: candidates } as Filter<T>);
  }
}
