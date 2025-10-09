import type { DocumentClass, BaseDocument } from './document';

export type OrmEntityDocument<T extends Record<string, unknown>> = T & BaseDocument & {
  _id: unknown;
};

export abstract class OrmRepository<T extends Record<string, unknown>> {
  abstract get collectionName(): string;
  abstract get entity(): DocumentClass<T>;

  abstract find(filter?: unknown, options?: unknown): Promise<unknown>;
  abstract findOne(filter?: unknown, options?: unknown): Promise<unknown>;
  abstract findById(id: unknown, options?: unknown): Promise<unknown>;
  abstract count(filter?: unknown, options?: unknown): Promise<number>;
  abstract insertOne(doc: unknown): Promise<unknown>;
  abstract insertMany(docs: unknown[]): Promise<unknown>;
  abstract save(entity: unknown): Promise<unknown>;
  abstract updateMany(filter: unknown, update: unknown): Promise<number>;
  abstract softDelete(filter: unknown): Promise<number>;
  abstract restore(filter: unknown): Promise<number>;
  abstract deleteHard(filter: unknown): Promise<number>;
}

export type OrmRepositoryContract<T extends Record<string, unknown>> = OrmRepository<T>;
