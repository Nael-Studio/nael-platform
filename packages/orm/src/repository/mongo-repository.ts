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
import { OrmRepository } from '../interfaces/repository';

export interface FindManyOptions<T> extends FindOptions<T & BaseDocument> {
  withDeleted?: boolean;
}

export interface FindOneOptions<T> extends FindManyOptions<T> {}

export type EntityDocument<T> = WithId<T & BaseDocument>;

const buildNotDeletedFilter = <T>(): Filter<T & BaseDocument> =>
  ({
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  }) as Filter<T & BaseDocument>;

export class MongoRepository<T extends Record<string, unknown>> extends OrmRepository<T> {
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

  async find(filter: Filter<T> = {}, options: FindManyOptions<T> = {}): Promise<Array<EntityDocument<T>>> {
    const { withDeleted, ...mongoOptions } = options;
    const cursor = this.collection.find(this.applyFilter(filter, withDeleted), mongoOptions);
    return cursor.toArray() as Promise<Array<EntityDocument<T>>>;
  }

  async findOne(
    filter: Filter<T> = {},
    options: FindOneOptions<T> = {},
  ): Promise<EntityDocument<T> | null> {
    const { withDeleted, ...mongoOptions } = options;
    return (await this.collection.findOne(this.applyFilter(filter, withDeleted), mongoOptions)) as
      | EntityDocument<T>
      | null;
  }

  async findById(id: string | ObjectId, options: FindOneOptions<T> = {}): Promise<EntityDocument<T> | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return this.findOne({ _id: objectId } as Filter<T>, options);
  }

  async count(filter: Filter<T> = {}, options: FindManyOptions<T> = {}): Promise<number> {
    const { withDeleted, ...mongoOptions } = options;
    return this.collection.countDocuments(this.applyFilter(filter, withDeleted), mongoOptions);
  }

  async insertOne(doc: OptionalUnlessRequiredId<T>): Promise<EntityDocument<T>> {
    const prepared = this.prepareForInsert(doc);
    const result = await this.collection.insertOne(prepared);
    return { ...prepared, _id: result.insertedId } as EntityDocument<T>;
  }

  async insertMany(docs: OptionalUnlessRequiredId<T>[]): Promise<Array<EntityDocument<T>>> {
    const prepared = docs.map((doc) => this.prepareForInsert(doc));
    const result = await this.collection.insertMany(prepared);
    return prepared.map((doc, index) => ({
      ...doc,
      _id: result.insertedIds[index]!,
    })) as Array<EntityDocument<T>>;
  }

  async save(entity: Partial<T> & { _id?: ObjectId }): Promise<EntityDocument<T>> {
    if (entity._id) {
      const { _id, ...rest } = entity;
      const update = this.prepareForUpdate(rest as Partial<T>);
      await this.collection.updateOne({ _id } as Filter<T & BaseDocument>, update);
      const updated = await this.findById(_id, { withDeleted: true });
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
      } as MatchKeysAndValues<T & BaseDocument>;
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
      } as MatchKeysAndValues<T & BaseDocument>;
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
    const prepared: Record<string, unknown> = { ...doc };

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
    const prepared: Record<string, unknown> = { ...update };

    if (this.metadata.timestamps) {
      prepared.updatedAt = new Date();
      delete prepared.createdAt;
    }

    const set: Record<string, unknown> = {};
    const unset: Record<string, true> = {};

    for (const [key, value] of Object.entries(prepared)) {
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
}
