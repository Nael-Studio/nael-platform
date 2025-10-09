import type { DocumentClass } from './document';

export type OrmEntityDocument<T extends object> = Omit<T, '_id'> & {
  id: string;
  _id: unknown;
};

export abstract class OrmRepository<
  TEntity extends object,
  TFilter = unknown,
  TFindManyOptions = unknown,
  TFindOneOptions = TFindManyOptions,
  TInsert = TEntity,
  TUpdate = Partial<TEntity>,
  TDocument extends object = OrmEntityDocument<TEntity>,
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
  abstract save(entity: Partial<TEntity> & { id?: string; _id?: unknown }): Promise<TDocument>;
  abstract updateMany(filter: TFilter, update: TUpdate): Promise<number>;
  abstract softDelete(filter: TFilter): Promise<number>;
  abstract restore(filter: TFilter): Promise<number>;
  abstract deleteHard(filter: TFilter): Promise<number>;
}

export type OrmRepositoryContract<T extends object> = OrmRepository<T>;
