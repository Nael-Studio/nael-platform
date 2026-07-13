import type {
  AggregateOptions,
  AnyBulkWriteOperation,
  BulkWriteOptions,
  BulkWriteResult,
  ChangeStreamDocument,
  ChangeStreamOptions,
  ClientSession,
  Collection,
  Document,
  Filter,
  FindOptions,
  InsertOneOptions,
  MatchKeysAndValues,
  OptionalUnlessRequiredId,
  Sort,
  UpdateFilter,
  UpdateOptions,
  WithId,
} from 'mongodb';
import { ObjectId } from 'mongodb';
import { plainToInstance } from 'class-transformer';
import { transformAndValidate, type CacheStore, type ClassType } from '@nl-framework/core';
import type {
  DocumentMetadata,
  BaseDocument,
  DocumentClass,
  HookType,
  PropMetadata,
  RelationMetadata,
} from '../interfaces/document';
import { OrmRepository, type OrmEntityDocument } from '../interfaces/repository';
import type { EntityWriteEventInput, WriteNotifier } from '../events/write-notifier';
import {
  describeFilterShape,
  hasQueryObservers,
  notifyQueryObservers,
} from '../observability/query-observer';
import { EntityNotFoundException } from '../exceptions/entity-not-found.exception';
import { OptimisticLockException } from '../exceptions/optimistic-lock.exception';

/** Resolve a prop default: call it when it's a factory, otherwise use it verbatim. */
const resolveDefault = (value: unknown): unknown =>
  typeof value === 'function' ? (value as () => unknown)() : value;

/**
 * A class instance whose identity class-transformer would destroy by deep-cloning
 * (ObjectId, Buffer, RegExp, Map, …). Plain objects, arrays, and Dates return
 * `false` — those are safe for class-transformer / embedded hydration to handle.
 */
const isSpecialInstance = (value: object): boolean => {
  if (Array.isArray(value) || value instanceof Date) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto !== Object.prototype && proto !== null;
};

/** Deterministic JSON with sorted object keys, so equivalent queries share a key. */
const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value instanceof ObjectId) {
    return JSON.stringify(value.toHexString());
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
};

/** Build a stable cache key for a query against a collection. */
const buildCacheKey = (collection: string, filter: unknown, options: unknown): string =>
  `orm:${collection}:${stableStringify({ filter, options })}`;

/** Map a change-stream operationType to a WriteNotifier operation (or null to ignore). */
const mapChangeOperation = (
  operationType: string,
): 'insert' | 'update' | 'delete' | null => {
  switch (operationType) {
    case 'insert':
      return 'insert';
    case 'update':
    case 'replace':
      return 'update';
    case 'delete':
      return 'delete';
    default:
      return null;
  }
};

/** Normalize a stored reference (ObjectId, string, or already-populated doc) to a string key. */
const idKeyOf = (value: unknown): string | null => {
  if (value instanceof ObjectId) {
    return value.toHexString();
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.id === 'string') {
      return record.id;
    }
    if (record._id instanceof ObjectId) {
      return record._id.toHexString();
    }
    if (typeof record._id === 'string') {
      return record._id;
    }
  }
  return null;
};

/** Per-call read-through cache directive. */
export interface QueryCacheOptions {
  ttlMs?: number;
  /** Explicit cache key; defaults to a stable hash of the collection + query. */
  key?: string;
}

export interface FindManyOptions<T> extends FindOptions<T & BaseDocument> {
  withDeleted?: boolean;
  /** `@Ref`/`@RefArray` fields to populate (one level, batched — no N+1). */
  populate?: Array<Extract<keyof T, string>> | string[];
  /** Opt-in read-through cache for this call. Ignored inside a transaction. */
  cache?: QueryCacheOptions;
}

/** Resolves the collection + metadata for a related document class on the same connection. */
export type RelationResolver = (
  target: DocumentClass,
) => Promise<{ collection: Collection<BaseDocument>; metadata: DocumentMetadata } | null>;

export interface RelationOptions {
  resolveRelation?: RelationResolver;
  logger?: { warn: (message: string) => void };
  /** Optional read-through cache backing `find(..., { cache })`. */
  cache?: CacheStore;
}

export interface FindOneOptions<T> extends FindManyOptions<T> {}

export interface WriteOptions {
  session?: ClientSession;
}

export interface ExistsOptions extends WriteOptions {
  withDeleted?: boolean;
}

export interface UpdateOneOptions extends WriteOptions {
  withDeleted?: boolean;
}

export interface DistinctOptions extends WriteOptions {
  withDeleted?: boolean;
}

export interface AggregateManyOptions extends AggregateOptions {
  withDeleted?: boolean;
}

/** Options accepted by keyset {@link MongoRepository.paginate}. */
export interface PaginateOptions<T> {
  limit: number;
  cursor?: string;
  sort?: Sort;
  withDeleted?: boolean;
  session?: ClientSession;
  projection?: FindOptions<T & BaseDocument>['projection'];
}

/** One page of keyset pagination results. */
export interface PaginatedResult<TDoc> {
  items: TDoc[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface BulkUpsertResult {
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
}

const buildNotDeletedFilter = <T>(): Filter<T & BaseDocument> =>
  ({
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  }) as Filter<T & BaseDocument>;

type SortEntry = [string, 1 | -1];

interface DecodedCursor {
  sort: Array<[string, number]>;
  values: unknown[];
}

interface TaggedValue {
  t: 'oid' | 'date' | 'raw';
  v: unknown;
}

const normalizeSortDirection = (dir: unknown): 1 | -1 =>
  dir === -1 || dir === '-1' || dir === 'desc' || dir === 'descending' ? -1 : 1;

/** Normalize any Mongo `Sort` value into ordered `[field, direction]` pairs with an `_id` tiebreaker. */
const normalizeSort = (sort?: Sort): SortEntry[] => {
  const entries: SortEntry[] = [];

  if (typeof sort === 'string') {
    entries.push([sort, 1]);
  } else if (Array.isArray(sort)) {
    const [first, second] = sort as unknown[];
    if (
      sort.length === 2 &&
      typeof first === 'string' &&
      (typeof second === 'number' || typeof second === 'string')
    ) {
      entries.push([first, normalizeSortDirection(second)]);
    } else {
      for (const item of sort as unknown[]) {
        if (typeof item === 'string') {
          entries.push([item, 1]);
        } else if (Array.isArray(item)) {
          entries.push([item[0] as string, normalizeSortDirection(item[1])]);
        }
      }
    }
  } else if (sort instanceof Map) {
    for (const [key, value] of sort.entries()) {
      entries.push([String(key), normalizeSortDirection(value)]);
    }
  } else if (sort && typeof sort === 'object') {
    for (const [key, value] of Object.entries(sort as Record<string, unknown>)) {
      entries.push([key, normalizeSortDirection(value)]);
    }
  }

  if (!entries.some(([field]) => field === '_id')) {
    entries.push(['_id', 1]);
  }
  return entries;
};

const sortSignature = (sort: SortEntry[]): Array<[string, number]> =>
  sort.map(([field, dir]) => [field, dir]);

const sortSignaturesEqual = (a: Array<[string, number]>, b: SortEntry[]): boolean =>
  a.length === b.length && a.every((entry, i) => entry[0] === b[i]![0] && entry[1] === b[i]![1]);

/**
 * Keyset "seek past the last row" filter for a compound sort. For sort keys
 * `(k1,k2,…)` it expands to `(k1 > v1) OR (k1 = v1 AND k2 > v2) OR …` (with `<`
 * for descending keys), which walks the index without `skip`.
 */
const buildKeysetFilter = <T>(sort: SortEntry[], values: unknown[]): Filter<T & BaseDocument> => {
  const or: Array<Record<string, unknown>> = [];
  for (let i = 0; i < sort.length; i += 1) {
    const clause: Record<string, unknown> = {};
    for (let j = 0; j < i; j += 1) {
      clause[sort[j]![0]] = values[j];
    }
    const [field, dir] = sort[i]!;
    clause[field] = { [dir === 1 ? '$gt' : '$lt']: values[i] };
    or.push(clause);
  }
  return { $or: or } as Filter<T & BaseDocument>;
};

const readSortValue = (doc: Record<string, unknown>, key: string): unknown => doc[key];

const encodeCursorValue = (value: unknown): TaggedValue => {
  if (value instanceof ObjectId) {
    return { t: 'oid', v: value.toHexString() };
  }
  if (value instanceof Date) {
    return { t: 'date', v: value.toISOString() };
  }
  return { t: 'raw', v: value };
};

const decodeCursorValue = (tagged: TaggedValue): unknown => {
  switch (tagged.t) {
    case 'oid':
      return new ObjectId(tagged.v as string);
    case 'date':
      return new Date(tagged.v as string);
    default:
      return tagged.v;
  }
};

const encodeCursor = (payload: { sort: Array<[string, number]>; values: TaggedValue[] }): string =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

const decodeCursor = (cursor: string): DecodedCursor => {
  let payload: { sort?: unknown; values?: unknown };
  try {
    payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new Error('paginate: invalid cursor');
  }
  if (!payload || !Array.isArray(payload.sort) || !Array.isArray(payload.values)) {
    throw new Error('paginate: invalid cursor');
  }
  return {
    sort: payload.sort as Array<[string, number]>,
    values: (payload.values as TaggedValue[]).map((value) => decodeCursorValue(value)),
  };
};

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
    private readonly notifier?: WriteNotifier,
    private readonly relationOptions: RelationOptions = {},
  ) {
    super();
    // When a cache is configured, invalidate this collection's cached keys on
    // any write to it (coarse but correct — per-key invalidation is out of scope).
    if (this.relationOptions.cache && this.notifier) {
      this.notifier.onWrite(async (event) => {
        if (event.collection === this.metadata.collection) {
          await this.invalidateCache();
        }
      });
    }
  }

  private readonly cachedKeys = new Set<string>();

  private async emitWrite(
    event: Omit<EntityWriteEventInput, 'collection' | 'target'>,
  ): Promise<void> {
    if (!this.notifier?.hasListeners) {
      return;
    }
    await this.notifier.emit({
      collection: this.metadata.collection,
      target: this.metadata.target,
      ...event,
    });
  }

  get collectionName(): string {
    return this.metadata.collection;
  }

  get entity(): DocumentClass<T> {
    return this.metadata.target as DocumentClass<T>;
  }

  /** Human-readable entity name used in error messages (class name, falling back to collection). */
  private get entityName(): string {
    return this.metadata.target?.name || this.metadata.collection;
  }

  private get props(): PropMetadata[] {
    return this.metadata.props ?? [];
  }

  private get versionField(): string | undefined {
    return this.metadata.versionField;
  }

  /**
   * When the document is `@Document({ validate: true })`, run class-validator
   * against the entity before it reaches the driver. Throws the framework's
   * `ValidationException` (the same shape HTTP pipes produce). Undecorated fields
   * are skipped; `partial` skips missing properties for update/upsert paths.
   */
  private hasHooks(type: HookType): boolean {
    return (this.metadata.hooks?.[type]?.length ?? 0) > 0;
  }

  /** Build a class instance from a plain object, preserving special-value identity. */
  private hydrateInstance(base: Record<string, unknown>): Record<string, unknown> {
    if (!this.metadata.target) {
      return base;
    }
    const instance = plainToInstance(this.metadata.target as ClassType, base, {
      ignoreDecorators: true,
    }) as Record<string, unknown>;
    for (const [key, value] of Object.entries(base)) {
      if (value !== null && typeof value === 'object' && isSpecialInstance(value)) {
        instance[key] = value;
      }
    }
    return instance;
  }

  /** Run the named lifecycle hooks sequentially on the given instance. A throw aborts. */
  private async runHooks(type: HookType, instance: object): Promise<void> {
    const names = this.metadata.hooks?.[type];
    if (!names?.length) {
      return;
    }
    for (const name of names) {
      const fn = (instance as Record<string, unknown>)[name];
      if (typeof fn === 'function') {
        await (fn as (...args: unknown[]) => unknown).call(instance);
      }
    }
  }

  private async validateWrite(value: object, partial: boolean): Promise<void> {
    if (!this.metadata.validate || !this.metadata.target) {
      return;
    }
    await transformAndValidate({
      metatype: this.metadata.target as ClassType,
      value,
      sanitize: false,
      validatorOptions: {
        forbidUnknownValues: false,
        whitelist: false,
        skipMissingProperties: partial,
      },
    });
  }

  /**
   * Times a read and reports its **filter shape** (never values) to any registered
   * `QueryObserver`. Zero overhead when none is registered (single boolean check).
   */
  private async observeRead<R>(
    op: string,
    filter: unknown,
    run: () => Promise<R>,
    countOf?: (result: R) => number | undefined,
  ): Promise<R> {
    if (!hasQueryObservers()) {
      return run();
    }
    const start = performance.now();
    let count: number | undefined;
    try {
      const result = await run();
      count = countOf ? countOf(result) : undefined;
      return result;
    } finally {
      notifyQueryObservers({
        collection: this.metadata.collection,
        op,
        filterShape: describeFilterShape(filter),
        durationMs: performance.now() - start,
        count,
        at: Date.now(),
      });
    }
  }

  find(filter: Filter<T> = {}, options: FindManyOptions<T> = {}): Promise<Array<OrmEntityDocument<T>>> {
    return this.observeRead('find', filter, () => this.findInternal(filter, options), (r) => r.length);
  }

  private async findInternal(filter: Filter<T> = {}, options: FindManyOptions<T> = {}): Promise<Array<OrmEntityDocument<T>>> {
    const { withDeleted, populate, cache, ...mongoOptions } = options;

    // Read-through cache: opt-in per call, never inside a transaction.
    const cacheStore = this.relationOptions.cache;
    const useCache = Boolean(cache && cacheStore && !mongoOptions.session);
    let cacheKey: string | undefined;
    if (useCache) {
      cacheKey = cache!.key ?? buildCacheKey(this.metadata.collection, filter, { withDeleted, populate, ...mongoOptions });
      const hit = await cacheStore!.get<Array<OrmEntityDocument<T>>>(cacheKey);
      if (hit !== undefined) {
        return hit;
      }
    }

    const cursor = this.collection.find(this.applyFilter(filter, withDeleted), mongoOptions);
    const results = await cursor.toArray();
    const mapped = results.map((doc) => this.mapDocument(doc as WithId<T & BaseDocument>));
    if (populate?.length) {
      await this.populateDocuments(mapped, populate as string[]);
    }

    if (useCache && cacheKey) {
      await cacheStore!.set(cacheKey, mapped, { ttl: cache!.ttlMs });
      this.cachedKeys.add(cacheKey);
    }
    return mapped;
  }

  private async invalidateCache(): Promise<void> {
    const cacheStore = this.relationOptions.cache;
    if (!cacheStore || !this.cachedKeys.size) {
      return;
    }
    const keys = [...this.cachedKeys];
    this.cachedKeys.clear();
    await Promise.all(keys.map((key) => cacheStore.delete(key)));
  }

  findOne(
    filter: Filter<T> = {},
    options: FindOneOptions<T> = {},
  ): Promise<OrmEntityDocument<T> | null> {
    return this.observeRead('findOne', filter, () => this.findOneInternal(filter, options), (r) =>
      r ? 1 : 0,
    );
  }

  private async findOneInternal(
    filter: Filter<T> = {},
    options: FindOneOptions<T> = {},
  ): Promise<OrmEntityDocument<T> | null> {
    const { withDeleted, populate, ...mongoOptions } = options;
    const document = (await this.collection.findOne(
      this.applyFilter(filter, withDeleted),
      mongoOptions,
    )) as (WithId<T & BaseDocument> & { id?: string }) | null;
    if (!document) {
      return null;
    }
    const mapped = this.mapDocument(document);
    if (populate?.length) {
      await this.populateDocuments([mapped], populate as string[]);
    }
    return mapped;
  }

  async findById(id: string | ObjectId, options: FindOneOptions<T> = {}): Promise<OrmEntityDocument<T> | null> {
    return this.findOne(this.buildIdFilter(id), options);
  }

  count(filter: Filter<T> = {}, options: FindManyOptions<T> = {}): Promise<number> {
    return this.observeRead('count', filter, () => {
      const { withDeleted, ...mongoOptions } = options;
      return this.collection.countDocuments(this.applyFilter(filter, withDeleted), mongoOptions);
    });
  }

  /** Cheap existence check — soft-delete aware, stops at the first match. */
  async exists(filter: Filter<T> = {}, options: ExistsOptions = {}): Promise<boolean> {
    const { withDeleted, session } = options;
    const count = await this.collection.countDocuments(this.applyFilter(filter, withDeleted), {
      limit: 1,
      session,
    });
    return count > 0;
  }

  /** Like {@link findOne} but throws {@link EntityNotFoundException} instead of returning null. */
  async findOneOrFail(
    filter: Filter<T> = {},
    options: FindOneOptions<T> = {},
  ): Promise<OrmEntityDocument<T>> {
    const document = await this.findOne(filter, options);
    if (!document) {
      throw new EntityNotFoundException(this.entityName, filter);
    }
    return document;
  }

  /** Like {@link findById} but throws {@link EntityNotFoundException} instead of returning null. */
  async findByIdOrFail(
    id: string | ObjectId,
    options: FindOneOptions<T> = {},
  ): Promise<OrmEntityDocument<T>> {
    const document = await this.findById(id, options);
    if (!document) {
      throw new EntityNotFoundException(this.entityName, { id: this.normalizeIdValue(id) });
    }
    return document;
  }

  /**
   * Atomic single-document update. Returns the updated (post-image) document
   * mapped like {@link findOne}, or `null` when nothing matched. Soft-deleted
   * documents are excluded unless `withDeleted` is set.
   */
  async updateOne(
    filter: Filter<T>,
    update: Partial<T>,
    options: UpdateOneOptions = {},
  ): Promise<OrmEntityDocument<T> | null> {
    const { withDeleted, session } = options;
    const prepared = this.prepareForUpdate(update);
    const baseFilter = this.applyFilter(filter, withDeleted);
    const currentVersion = this.applyOptimisticLock(prepared, update as Record<string, unknown>);
    const writeFilter =
      currentVersion === undefined
        ? baseFilter
        : ({ $and: [baseFilter, { [this.versionField!]: currentVersion }] } as Filter<T & BaseDocument>);

    const document = (await this.collection.findOneAndUpdate(writeFilter, prepared, {
      returnDocument: 'after',
      includeResultMetadata: false,
      session,
    })) as WithId<T & BaseDocument> | null;
    if (!document) {
      if (currentVersion !== undefined) {
        const exists = await this.collection.findOne(baseFilter, { session });
        if (exists) {
          throw new OptimisticLockException(this.entityName, currentVersion);
        }
      }
      return null;
    }
    const mapped = this.mapDocument(document);
    await this.emitWrite({
      operation: 'update',
      documents: [mapped],
      ids: [mapped.id],
      count: 1,
      session,
    });
    return mapped;
  }

  /**
   * When `@Version` is set and the update carries a version value, strip it from
   * `$set`, add a `$inc` on the version field, and return the current version so
   * the caller can pin it in the filter. Returns `undefined` when locking does
   * not apply.
   */
  private applyOptimisticLock(
    update: UpdateFilter<T & BaseDocument>,
    source: Record<string, unknown>,
  ): unknown {
    const field = this.versionField;
    if (!field) {
      return undefined;
    }
    const current = source[field];
    if (current === undefined || current === null) {
      return undefined;
    }
    if (update.$set && field in (update.$set as Record<string, unknown>)) {
      delete (update.$set as Record<string, unknown>)[field];
      if (!Object.keys(update.$set as object).length) {
        delete update.$set;
      }
    }
    update.$inc = {
      ...((update.$inc as Record<string, unknown>) ?? {}),
      [field]: 1,
    } as UpdateFilter<T & BaseDocument>['$inc'];
    return current;
  }

  private async throwForFailedUpdate(
    filter: Filter<T>,
    currentVersion: unknown,
    session?: ClientSession,
  ): Promise<never> {
    if (currentVersion !== undefined) {
      const exists = await this.collection.findOne(filter as Filter<T & BaseDocument>, { session });
      if (exists) {
        throw new OptimisticLockException(this.entityName, currentVersion);
      }
    }
    throw new Error('Failed to load entity after update');
  }

  /**
   * Atomically increment a numeric field on every matching document. Returns
   * the number of documents modified. `updatedAt` is bumped when the document
   * uses timestamps.
   */
  async increment(
    filter: Filter<T>,
    field: Extract<keyof T, string>,
    by = 1,
    options: WriteOptions = {},
  ): Promise<number> {
    const update: UpdateFilter<T & BaseDocument> = {
      $inc: { [field]: by } as unknown as UpdateFilter<T & BaseDocument>['$inc'],
    };
    if (this.metadata.timestamps) {
      update.$currentDate = {
        updatedAt: true,
      } as unknown as MatchKeysAndValues<T & BaseDocument>;
    }
    const result = await this.collection.updateMany(this.applyFilter(filter), update, options);
    await this.emitWrite({
      operation: 'updateMany',
      filter,
      count: result.modifiedCount,
      session: options.session,
    });
    return result.modifiedCount;
  }

  /** Distinct values for a field, soft-delete aware. */
  async distinct<K = unknown>(
    field: Extract<keyof (T & BaseDocument), string> | string,
    filter: Filter<T> = {},
    options: DistinctOptions = {},
  ): Promise<K[]> {
    const { withDeleted, session } = options;
    const values = await this.collection.distinct(
      field as string,
      this.applyFilter(filter, withDeleted) as Filter<T & BaseDocument>,
      { session } as never,
    );
    return values as K[];
  }

  async insertOne(
    doc: OptionalUnlessRequiredId<T>,
    options: InsertOneOptions = {},
  ): Promise<OrmEntityDocument<T>> {
    let value: object = doc as object;
    if (this.hasHooks('beforeInsert') || this.hasHooks('afterInsert')) {
      value = this.hydrateInstance({ ...(doc as object) });
    }
    await this.runHooks('beforeInsert', value);
    await this.validateWrite(value, false);
    const prepared = this.prepareForInsert(value as OptionalUnlessRequiredId<T>);
    const result = await this.collection.insertOne(prepared, options);
    const persisted = {
      ...prepared,
      _id: prepared._id ?? result.insertedId,
    } as WithId<T & BaseDocument>;
    const mapped = this.mapDocument(persisted);
    await this.runHooks('afterInsert', mapped as object);
    await this.emitWrite({
      operation: 'insert',
      documents: [mapped],
      ids: [mapped.id],
      count: 1,
      session: options.session,
    });
    return mapped;
  }

  async insertMany(
    docs: OptionalUnlessRequiredId<T>[],
    options: BulkWriteOptions = {},
  ): Promise<Array<OrmEntityDocument<T>>> {
    const runHooks = this.hasHooks('beforeInsert') || this.hasHooks('afterInsert');
    const values = docs.map((doc) => (runHooks ? this.hydrateInstance({ ...(doc as object) }) : (doc as object)));
    for (const value of values) {
      await this.runHooks('beforeInsert', value);
      await this.validateWrite(value, false);
    }
    const prepared = values.map((value) => this.prepareForInsert(value as OptionalUnlessRequiredId<T>));
    const result = await this.collection.insertMany(prepared, options);
    const mapped = prepared.map((doc, index) =>
      this.mapDocument({
        ...doc,
        _id: doc._id ?? result.insertedIds[index]!,
      } as WithId<T & BaseDocument>),
    );
    for (const entity of mapped) {
      await this.runHooks('afterInsert', entity as object);
    }
    if (mapped.length) {
      await this.emitWrite({
        operation: 'insert',
        documents: mapped,
        ids: mapped.map((doc) => doc.id),
        count: mapped.length,
        session: options.session,
      });
    }
    return mapped;
  }

  async save(
    entity: Partial<T> & { id?: string; _id?: string | ObjectId },
    options: WriteOptions = {},
  ): Promise<OrmEntityDocument<T>> {
    const identifier = entity.id ?? entity._id;

    if (identifier !== undefined && identifier !== null) {
      const filter = this.buildIdFilter(identifier);
      const { id, _id, ...rest } = entity;
      let value: object = rest as object;
      if (this.hasHooks('beforeUpdate')) {
        value = this.hydrateInstance({ ...(rest as object) });
        await this.runHooks('beforeUpdate', value);
      }
      await this.validateWrite(value, true);
      const update = this.prepareForUpdate(value as Partial<T>);

      // Optimistic locking: pin the current version in the filter and $inc it.
      const currentVersion = this.applyOptimisticLock(update, value as Record<string, unknown>);
      const writeFilter =
        currentVersion === undefined
          ? (filter as Filter<T & BaseDocument>)
          : ({ $and: [filter, { [this.versionField!]: currentVersion }] } as Filter<T & BaseDocument>);

      const document = (await this.collection.findOneAndUpdate(writeFilter, update, {
        returnDocument: 'after',
        includeResultMetadata: false,
        session: options.session,
      })) as WithId<T & BaseDocument> | null;
      if (!document) {
        await this.throwForFailedUpdate(filter, currentVersion, options.session);
      }
      const updated = this.mapDocument(document as WithId<T & BaseDocument>);
      await this.runHooks('afterUpdate', updated as object);
      await this.emitWrite({
        operation: 'update',
        documents: [updated],
        ids: [updated.id],
        count: 1,
        session: options.session,
      });
      return updated;
    }

    return this.insertOne(entity as OptionalUnlessRequiredId<T>, options);
  }

  async updateMany(filter: Filter<T>, update: Partial<T>, options: UpdateOptions = {}): Promise<number> {
    const result = await this.collection.updateMany(
      this.applyFilter(filter, true),
      this.prepareForUpdate(update),
      options,
    );
    await this.emitWrite({
      operation: 'updateMany',
      filter,
      count: result.modifiedCount,
      session: options.session,
    });
    return result.modifiedCount;
  }

  /**
   * When `@BeforeDelete`/`@AfterDelete` hooks are registered, load the matching
   * entities as hydrated instances so the hooks can run on them; otherwise skip
   * the extra read and return `null`.
   */
  private async loadForDeleteHooks(filter: Filter<T>): Promise<Array<OrmEntityDocument<T>> | null> {
    if (!this.hasHooks('beforeDelete') && !this.hasHooks('afterDelete')) {
      return null;
    }
    return this.find(filter, { withDeleted: true });
  }

  async softDelete(filter: Filter<T>, options: WriteOptions = {}): Promise<number> {
    if (!this.metadata.softDelete) {
      return this.deleteHard(filter, options);
    }

    const affected = await this.loadForDeleteHooks(filter);
    if (affected) {
      for (const entity of affected) {
        await this.runHooks('beforeDelete', entity as object);
      }
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

    const result = await this.collection.updateMany(this.applyFilter(filter, true), update, options);

    if (affected) {
      for (const entity of affected) {
        await this.runHooks('afterDelete', entity as object);
      }
    }

    await this.emitWrite({
      operation: 'softDelete',
      filter,
      count: result.modifiedCount,
      session: options.session,
    });
    return result.modifiedCount;
  }

  async restore(filter: Filter<T>, options: WriteOptions = {}): Promise<number> {
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

    const result = await this.collection.updateMany(this.applyFilter(filter, true), update, options);
    await this.emitWrite({
      operation: 'restore',
      filter,
      count: result.modifiedCount,
      session: options.session,
    });
    return result.modifiedCount;
  }

  async deleteHard(filter: Filter<T>, options: WriteOptions = {}): Promise<number> {
    const affected = await this.loadForDeleteHooks(filter);
    if (affected) {
      for (const entity of affected) {
        await this.runHooks('beforeDelete', entity as object);
      }
    }

    const result = await this.collection.deleteMany(filter as Filter<T & BaseDocument>, options);
    const deleted = result.deletedCount ?? 0;

    if (affected) {
      for (const entity of affected) {
        await this.runHooks('afterDelete', entity as object);
      }
    }

    await this.emitWrite({
      operation: 'delete',
      filter,
      count: deleted,
      session: options.session,
    });
    return deleted;
  }

  /** Hard-delete every document matching the filter, regardless of soft-delete settings. */
  async deleteMany(filter: Filter<T>, options: WriteOptions = {}): Promise<number> {
    return this.deleteHard(filter, options);
  }

  /** Raw bulk write against the underlying collection. Documents are passed through untouched. */
  async bulkWrite(
    operations: AnyBulkWriteOperation<T & BaseDocument>[],
    options: BulkWriteOptions = {},
  ): Promise<BulkWriteResult> {
    const result = await this.collection.bulkWrite(operations, options);
    await this.emitWrite({
      operation: 'bulkWrite',
      count: result.insertedCount + result.upsertedCount + result.modifiedCount + result.deletedCount,
      session: options.session,
    });
    return result;
  }

  /**
   * Upsert many documents in a single round trip, matched on the given
   * natural-key fields. Timestamps are handled like the other write paths:
   * `updatedAt` on every write, `createdAt` only on insert.
   */
  async bulkUpsert(
    docs: Array<Partial<T>>,
    keyFields: Array<Extract<keyof T, string>>,
    options: BulkWriteOptions = {},
  ): Promise<BulkUpsertResult> {
    if (!keyFields.length) {
      throw new Error('bulkUpsert requires at least one key field');
    }
    if (!docs.length) {
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    }

    for (const doc of docs) {
      await this.validateWrite(doc as object, true);
    }

    const now = new Date();
    const operations = docs.map((doc) => {
      const source = doc as Record<string, unknown>;
      const filter: Record<string, unknown> = {};
      for (const key of keyFields) {
        filter[key] = source[key];
      }

      const { id, _id, ...set } = source;
      const setOnInsert: Record<string, unknown> = {};

      if (this.metadata.timestamps) {
        delete set.createdAt;
        set.updatedAt = now;
        setOnInsert.createdAt = now;
      }

      if (this.metadata.softDelete && !('deletedAt' in set)) {
        setOnInsert.deletedAt = null;
      }

      return {
        updateOne: {
          filter,
          update: {
            $set: set,
            ...(Object.keys(setOnInsert).length ? { $setOnInsert: setOnInsert } : {}),
          },
          upsert: true,
        },
      };
    });

    const result = await this.collection.bulkWrite(
      operations as AnyBulkWriteOperation<T & BaseDocument>[],
      options,
    );

    await this.emitWrite({
      operation: 'bulkUpsert',
      documents: docs,
      count: result.modifiedCount + result.upsertedCount,
      session: options.session,
    });

    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
    };
  }

  /**
   * Run an aggregation pipeline. When the document uses soft-delete and
   * `withDeleted` is not set, a not-deleted `$match` stage is prepended. User
   * `$match` stages are never rewritten.
   */
  aggregate<R extends Document = Document>(
    pipeline: Document[],
    options: AggregateManyOptions = {},
  ): Promise<R[]> {
    return this.observeRead(
      'aggregate',
      { pipeline: pipeline.length },
      () => this.buildAggregateCursor<R>(pipeline, options).toArray(),
      (r) => r.length,
    );
  }

  /**
   * Streaming variant of {@link aggregate}. Yields raw pipeline output — results
   * are **not** mapped through `mapDocument` because the shape is pipeline-defined.
   * Don't hold the returned cursor open across a transaction boundary.
   */
  async *aggregateCursor<R extends Document = Document>(
    pipeline: Document[],
    options: AggregateManyOptions = {},
  ): AsyncIterable<R> {
    const cursor = this.buildAggregateCursor<R>(pipeline, options);
    try {
      for await (const doc of cursor) {
        yield doc as R;
      }
    } finally {
      await cursor.close();
    }
  }

  private buildAggregateCursor<R extends Document>(pipeline: Document[], options: AggregateManyOptions) {
    const { withDeleted, ...mongoOptions } = options;
    const stages =
      this.metadata.softDelete && !withDeleted
        ? [{ $match: buildNotDeletedFilter<T>() }, ...pipeline]
        : pipeline;
    return this.collection.aggregate<R>(stages, mongoOptions);
  }

  /**
   * Stream documents one at a time, each mapped through `mapDocument`, honouring
   * soft-delete filtering like {@link find}. Prefer this over {@link find} for
   * large result sets. Caveat: don't hold the cursor open across a transaction
   * boundary — the session may be committed/aborted before iteration finishes.
   */
  async *findCursor(
    filter: Filter<T> = {},
    options: FindManyOptions<T> = {},
  ): AsyncIterable<OrmEntityDocument<T>> {
    const { withDeleted, ...mongoOptions } = options;
    const cursor = this.collection.find(this.applyFilter(filter, withDeleted), mongoOptions);
    try {
      for await (const doc of cursor) {
        yield this.mapDocument(doc as WithId<T & BaseDocument>);
      }
    } finally {
      await cursor.close();
    }
  }

  /**
   * Fetch a page of documents plus the total matching count, running the two
   * queries in parallel. The count ignores `skip`/`limit`.
   */
  async findAndCount(
    filter: Filter<T> = {},
    options: FindManyOptions<T> = {},
  ): Promise<[Array<OrmEntityDocument<T>>, number]> {
    const { withDeleted, ...countable } = options;
    const [items, total] = await Promise.all([
      this.find(filter, options),
      this.count(filter, { withDeleted, session: countable.session }),
    ]);
    return [items, total];
  }

  /**
   * Keyset (cursor) pagination — stable under concurrent writes and cheap at any
   * offset because it never uses `skip`. The cursor encodes the sort key values
   * of the last item plus the `_id` tiebreaker and the sort itself; supplying a
   * `cursor` produced under a different `sort` is rejected. Default sort `_id: 1`.
   */
  async paginate(
    filter: Filter<T> = {},
    options: PaginateOptions<T>,
  ): Promise<PaginatedResult<OrmEntityDocument<T>>> {
    const limit = Math.max(1, Math.floor(options.limit));
    const sort = normalizeSort(options.sort);
    const sortKeys = sort.map(([field]) => field);

    let after: DecodedCursor | null = null;
    if (options.cursor) {
      after = decodeCursor(options.cursor);
      if (!sortSignaturesEqual(after.sort, sort)) {
        throw new Error(
          'paginate: cursor was produced with a different sort; pass the same sort or omit the cursor',
        );
      }
    }

    const filters: Array<Filter<T & BaseDocument>> = [this.applyFilter(filter, options.withDeleted)];
    if (after) {
      filters.push(buildKeysetFilter<T>(sort, after.values));
    }
    const finalFilter =
      filters.length === 1 ? filters[0]! : ({ $and: filters } as Filter<T & BaseDocument>);

    // Over-fetch one row to detect whether a further page exists.
    const rows = await this.collection
      .find(finalFilter, {
        sort: sort as Sort,
        limit: limit + 1,
        projection: options.projection,
        session: options.session,
      })
      .toArray();

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const items = pageRows.map((doc) => this.mapDocument(doc as WithId<T & BaseDocument>));

    let nextCursor: string | null = null;
    if (hasMore && pageRows.length > 0) {
      const last = pageRows[pageRows.length - 1] as Record<string, unknown>;
      const values = sortKeys.map((key) => encodeCursorValue(readSortValue(last, key)));
      nextCursor = encodeCursor({ sort: sortSignature(sort), values });
    }

    return { items, nextCursor, hasMore };
  }

  /**
   * Stream change events for this collection via a MongoDB change stream. Each
   * event's `fullDocument` (when present) is hydrated like {@link findOne}.
   *
   * **Requires a replica set** (change streams are unavailable on standalone
   * topologies). Don't hold the stream open across a transaction boundary.
   */
  async *watch(
    pipeline: Document[] = [],
    options: ChangeStreamOptions = {},
  ): AsyncIterable<ChangeStreamDocument<T & BaseDocument>> {
    const stream = this.collection.watch<T & BaseDocument>(pipeline, options);
    try {
      for await (const change of stream) {
        const withDoc = change as { fullDocument?: WithId<T & BaseDocument> };
        if (withDoc.fullDocument) {
          withDoc.fullDocument = this.mapDocument(withDoc.fullDocument) as unknown as WithId<T & BaseDocument>;
        }
        yield change as ChangeStreamDocument<T & BaseDocument>;
      }
    } finally {
      await stream.close();
    }
  }

  /**
   * Opt-in bridge that re-emits change-stream events into the {@link WriteNotifier}
   * so writes made outside this process surface to local listeners. Uses
   * `fullDocument: 'updateLookup'` so updates carry the post-image. Returns a
   * `stop()` to close the stream. Requires a replica set + a configured notifier.
   */
  bridgeChangesToNotifier(options: ChangeStreamOptions = {}): { stop: () => Promise<void> } {
    if (!this.notifier) {
      throw new Error('bridgeChangesToNotifier requires a WriteNotifier to be configured');
    }
    const stream = this.collection.watch<T & BaseDocument>([], {
      fullDocument: 'updateLookup',
      ...options,
    });

    void (async () => {
      try {
        for await (const change of stream) {
          const operation = mapChangeOperation(change.operationType);
          if (!operation) {
            continue;
          }
          const full = (change as { fullDocument?: WithId<T & BaseDocument> }).fullDocument;
          const mapped = full ? this.mapDocument(full) : undefined;
          await this.emitWrite({
            operation,
            documents: mapped ? [mapped] : undefined,
            ids: mapped ? [mapped.id] : undefined,
            count: 1,
          });
        }
      } catch {
        // Stream closed (stop() called) or errored — nothing to surface here.
      }
    })();

    return {
      stop: async () => {
        await stream.close();
      },
    };
  }

  private warnRelation(message: string): void {
    const logger = this.relationOptions.logger;
    if (logger) {
      logger.warn(message);
    } else {
      console.warn(message);
    }
  }

  /**
   * Populate `@Ref`/`@RefArray` fields in place. Ids are collected across the
   * whole result set and fetched with a single `$in` query per relation (no
   * N+1). Missing targets become `null` (single) or are dropped (array), each
   * with a warning. Nested populate is out of scope.
   */
  private async populateDocuments(docs: Array<OrmEntityDocument<T>>, fields: string[]): Promise<void> {
    const relations = this.metadata.relations ?? [];
    const resolve = this.relationOptions.resolveRelation;

    for (const field of fields) {
      const relation = relations.find((r) => r.propertyKey === field);
      if (!relation || relation.kind === 'embedded') {
        continue;
      }
      if (!resolve) {
        this.warnRelation(`populate('${field}') skipped: no relation resolver configured`);
        continue;
      }
      const resolved = await resolve(relation.target());
      if (!resolved) {
        this.warnRelation(`populate('${field}') skipped: target repository not resolvable`);
        continue;
      }

      // Collect distinct ids (keyed by hex/string) with their raw stored values.
      const rawByKey = new Map<string, unknown>();
      for (const doc of docs) {
        const value = (doc as Record<string, unknown>)[field];
        if (relation.kind === 'ref') {
          const key = idKeyOf(value);
          if (key) rawByKey.set(key, value);
        } else if (Array.isArray(value)) {
          for (const element of value) {
            const key = idKeyOf(element);
            if (key) rawByKey.set(key, element);
          }
        }
      }
      if (!rawByKey.size) {
        continue;
      }

      const found = await this.queryRelated(resolved, [...rawByKey.values()], [...rawByKey.keys()]);
      const byKey = new Map<string, unknown>();
      for (const target of found) {
        const record = target as Record<string, unknown>;
        if (typeof record.id === 'string') byKey.set(record.id, target);
        if (record._id instanceof ObjectId) byKey.set(record._id.toHexString(), target);
        else if (typeof record._id === 'string') byKey.set(record._id, target);
      }

      const targetName = relation.target().name;
      for (const doc of docs) {
        const record = doc as Record<string, unknown>;
        const value = record[field];
        if (relation.kind === 'ref') {
          const key = idKeyOf(value);
          const target = key ? byKey.get(key) : undefined;
          if (key && !target) {
            this.warnRelation(`populate('${field}'): no ${targetName} found for id ${key}`);
          }
          record[field] = target ?? null;
        } else if (Array.isArray(value)) {
          const populated: unknown[] = [];
          for (const element of value) {
            const key = idKeyOf(element);
            const target = key ? byKey.get(key) : undefined;
            if (target) {
              populated.push(target);
            } else if (key) {
              this.warnRelation(`populate('${field}'): no ${targetName} found for id ${key}`);
            }
          }
          record[field] = populated;
        }
      }
    }
  }

  private async queryRelated(
    resolved: { collection: Collection<BaseDocument>; metadata: DocumentMetadata },
    rawValues: unknown[],
    keys: string[],
  ): Promise<object[]> {
    const targetRepo = new MongoRepository<object>(
      resolved.collection as Collection<object & BaseDocument>,
      resolved.metadata,
    );
    const objectIds = keys
      .filter((key) => ObjectId.isValid(key))
      .map((key) => new ObjectId(key));
    const filter = {
      $or: [{ _id: { $in: [...rawValues, ...objectIds] } }, { id: { $in: keys } }],
    };
    return targetRepo.find(filter as never, { withDeleted: false });
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

    if (this.versionField) {
      prepared[this.versionField] ??= 0;
    }

    // Fill prop defaults, then apply `to` transforms (e.g. encrypt-at-rest).
    for (const prop of this.props) {
      const key = prop.propertyKey;
      if (prepared[key] === undefined && prop.default !== undefined) {
        prepared[key] = resolveDefault(prop.default);
      }
      if (prop.transform?.to && prepared[key] !== undefined && prepared[key] !== null) {
        prepared[key] = prop.transform.to(prepared[key]);
      }
    }

    return prepared as OptionalUnlessRequiredId<T & BaseDocument>;
  }

  private prepareForUpdate(update: Partial<T>): UpdateFilter<T & BaseDocument> {
  const prepared: Record<string, unknown> = { ...(update as Record<string, unknown>) };

    // Apply `to` transforms for any present prop values (defaults are insert-only).
    for (const prop of this.props) {
      const key = prop.propertyKey;
      if (prop.transform?.to && prepared[key] !== undefined && prepared[key] !== null) {
        prepared[key] = prop.transform.to(prepared[key]);
      }
    }

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

    const base: Record<string, unknown> = { ...(doc as object), id };

    // Apply `from` transforms and fill missing defaults before hydrating.
    for (const prop of this.props) {
      const key = prop.propertyKey;
      if (prop.transform?.from && base[key] !== undefined && base[key] !== null) {
        base[key] = prop.transform.from(base[key]);
      }
      if (base[key] === undefined && prop.default !== undefined) {
        base[key] = resolveDefault(prop.default);
      }
    }

    if (!this.metadata.hydrate || !this.metadata.target) {
      return base as OrmEntityDocument<T>;
    }

    const instance = this.hydrateInstance(base);
    this.hydrateEmbedded(instance);
    return instance as OrmEntityDocument<T>;
  }

  /** Convert `@Embedded` subdocuments into instances of their declared class. */
  private hydrateEmbedded(instance: Record<string, unknown>): void {
    const relations = this.metadata.relations ?? [];
    for (const relation of relations) {
      if (relation.kind !== 'embedded') {
        continue;
      }
      const value = instance[relation.propertyKey];
      if (value === undefined || value === null) {
        continue;
      }
      const embeddedClass = relation.target() as ClassType;
      instance[relation.propertyKey] = Array.isArray(value)
        ? value.map((item) => plainToInstance(embeddedClass, item, { ignoreDecorators: true }))
        : plainToInstance(embeddedClass, value, { ignoreDecorators: true });
    }
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
