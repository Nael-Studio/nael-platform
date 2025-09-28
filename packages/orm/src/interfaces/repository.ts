import type { DocumentClass, BaseDocument } from './document';

export type OrmEntityDocument<T extends Record<string, unknown>> = T & BaseDocument & {
  _id: unknown;
};

export interface OrmRepository<T extends Record<string, unknown>> {
  readonly collectionName: string;
  readonly entity: DocumentClass<T>;
  find(filter?: unknown, options?: unknown): Promise<unknown>;
  findOne(filter?: unknown, options?: unknown): Promise<unknown>;
  findById(id: unknown, options?: unknown): Promise<unknown>;
  count(filter?: unknown, options?: unknown): Promise<number>;
  insertOne(doc: unknown): Promise<unknown>;
  insertMany(docs: unknown[]): Promise<unknown>;
  save(entity: unknown): Promise<unknown>;
  updateMany(filter: unknown, update: unknown): Promise<number>;
  softDelete(filter: unknown): Promise<number>;
  restore(filter: unknown): Promise<number>;
  deleteHard(filter: unknown): Promise<number>;
}
