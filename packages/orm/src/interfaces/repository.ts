import type { DocumentClass } from './document';

export type OrmEntityDocument<T extends Record<string, unknown>> = Omit<T, '_id'> & {
  _id: unknown;
};

export abstract class OrmRepository<
  TEntity extends Record<string, unknown>,
  TFilter = unknown,
  TFindManyOptions = unknown,
  TFindOneOptions = TFindManyOptions,
  TInsert = TEntity,
  TUpdate = Partial<TEntity>,
  TDocument extends Record<string, unknown> = OrmEntityDocument<TEntity>,
> {
  abstract get collectionName(): string;
  abstract get entity(): DocumentClass<TEntity>;

  abstract find(
    filter?: TFilter,
    options?: TFindManyOptions,
  ): Promise<Array<TDocument>>;
  abstract findOne(
    filter?: TFilter,
    options?: TFindOneOptions,
  ): Promise<TDocument | null>;
  abstract findById(
    id: unknown,
    options?: TFindOneOptions,
  ): Promise<TDocument | null>;
  abstract count(filter?: TFilter, options?: TFindManyOptions): Promise<number>;
  abstract insertOne(doc: TInsert): Promise<TDocument>;
  abstract insertMany(docs: TInsert[]): Promise<Array<TDocument>>;
  abstract save(entity: Partial<TEntity> & { _id?: unknown }): Promise<TDocument>;
  abstract updateMany(filter: TFilter, update: TUpdate): Promise<number>;
  abstract softDelete(filter: TFilter): Promise<number>;
  abstract restore(filter: TFilter): Promise<number>;
  abstract deleteHard(filter: TFilter): Promise<number>;
}

export type OrmRepositoryContract<T extends Record<string, unknown>> = OrmRepository<T>;
