import type { DocumentClass, OrmEntityDocument, OrmRepository } from '@nl-framework/orm';

/**
 * A Mongo-ish filter for the in-memory repository. Supports plain equality plus
 * the operator subset the ORM itself relies on: logical (`$and`/`$or`/`$nor`),
 * `$eq`/`$ne`/`$in`/`$nin`/`$exists`/`$not`, comparison (`$gt`/`$gte`/`$lt`/`$lte`),
 * and `$regex`. Dot-notation field paths are matched against nested values.
 */
export type InMemoryFilter<T> = Record<string, unknown>;

export interface InMemoryFindOptions {
  /** Include soft-deleted documents in the result. */
  withDeleted?: boolean;
  sort?: Record<string, 1 | -1>;
  skip?: number;
  limit?: number;
  projection?: Record<string, 0 | 1>;
  /** Accepted and ignored, for signature parity with the real repository. */
  session?: unknown;
}

export interface InMemoryRepositoryOptions<T extends object> {
  collectionName?: string;
  /** Defaults to `true`, matching `@Document`'s default. */
  timestamps?: boolean;
  /** Defaults to `true`, matching `@Document`'s default. */
  softDelete?: boolean;
  /** Documents to preload. Prepared exactly like `insertMany`. */
  seed?: Array<Partial<T>>;
}

type StoredDocument = Record<string, unknown>;

let idCounter = 0;

const generateId = (): string => {
  idCounter = (idCounter + 1) >>> 0;
  const time = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0');
  const rand = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0');
  const inc = idCounter.toString(16).padStart(10, '0').slice(-10);
  return (time + rand + inc).slice(0, 24);
};

const defaultCollectionName = (entity: DocumentClass): string =>
  entity.name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);

const isOperatorObject = (value: unknown): value is Record<string, unknown> =>
  isPlainObject(value) && Object.keys(value).length > 0 && Object.keys(value).every((key) => key.startsWith('$'));

const getPath = (doc: StoredDocument, path: string): unknown => {
  if (!path.includes('.')) {
    return doc[path];
  }
  let current: unknown = doc;
  for (const segment of path.split('.')) {
    if (!isPlainObject(current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
};

const valuesEqual = (value: unknown, expected: unknown): boolean => {
  // Mongo semantics: `{ field: null }` also matches a missing field.
  if (expected === null) {
    return value === null || value === undefined;
  }
  if (value instanceof Date && expected instanceof Date) {
    return value.getTime() === expected.getTime();
  }
  if (Array.isArray(expected)) {
    return Array.isArray(value) && value.length === expected.length && value.every((v, i) => valuesEqual(v, expected[i]));
  }
  if (isPlainObject(value) && isPlainObject(expected)) {
    const a = Object.keys(value);
    const b = Object.keys(expected);
    return a.length === b.length && a.every((key) => valuesEqual(value[key], expected[key]));
  }
  return Object.is(value, expected);
};

const compareValues = (value: unknown, operand: unknown): number | undefined => {
  if (value instanceof Date && operand instanceof Date) {
    return value.getTime() - operand.getTime();
  }
  if (typeof value === 'number' && typeof operand === 'number') {
    return value - operand;
  }
  if (typeof value === 'string' && typeof operand === 'string') {
    return value < operand ? -1 : value > operand ? 1 : 0;
  }
  return undefined;
};

const matchesOperator = (value: unknown, op: string, operand: unknown): boolean => {
  switch (op) {
    case '$eq':
      return valuesEqual(value, operand);
    case '$ne':
      return !valuesEqual(value, operand);
    case '$in':
      return Array.isArray(operand) && operand.some((candidate) => valuesEqual(value, candidate));
    case '$nin':
      return !(Array.isArray(operand) && operand.some((candidate) => valuesEqual(value, candidate)));
    case '$exists':
      return (value !== undefined) === Boolean(operand);
    case '$not':
      return !matchesCondition(value, operand);
    case '$gt': {
      const cmp = compareValues(value, operand);
      return cmp !== undefined && cmp > 0;
    }
    case '$gte': {
      const cmp = compareValues(value, operand);
      return cmp !== undefined && cmp >= 0;
    }
    case '$lt': {
      const cmp = compareValues(value, operand);
      return cmp !== undefined && cmp < 0;
    }
    case '$lte': {
      const cmp = compareValues(value, operand);
      return cmp !== undefined && cmp <= 0;
    }
    case '$regex': {
      const source = operand instanceof RegExp ? operand : new RegExp(String(operand));
      return typeof value === 'string' && source.test(value);
    }
    default:
      throw new Error(`InMemoryRepository: unsupported query operator "${op}"`);
  }
};

const matchesCondition = (value: unknown, condition: unknown): boolean => {
  if (isOperatorObject(condition)) {
    return Object.entries(condition).every(([op, operand]) => matchesOperator(value, op, operand));
  }
  return valuesEqual(value, condition);
};

const matchesFilter = (doc: StoredDocument, filter: Record<string, unknown>): boolean => {
  for (const [key, condition] of Object.entries(filter)) {
    if (key === '$and') {
      if (!(condition as Array<Record<string, unknown>>).every((sub) => matchesFilter(doc, sub))) {
        return false;
      }
      continue;
    }
    if (key === '$or') {
      if (!(condition as Array<Record<string, unknown>>).some((sub) => matchesFilter(doc, sub))) {
        return false;
      }
      continue;
    }
    if (key === '$nor') {
      if ((condition as Array<Record<string, unknown>>).some((sub) => matchesFilter(doc, sub))) {
        return false;
      }
      continue;
    }
    if (!matchesCondition(getPath(doc, key), condition)) {
      return false;
    }
  }
  return true;
};

/**
 * A dependency-free, in-memory implementation of the ORM's repository contract.
 * Substitute it for a real repository in tests via
 * `overrideProvider(getRepositoryToken(Entity)).useValue(repo)`.
 *
 * Behavior mirrors `MongoRepository`: string `id` + `_id` assignment, `timestamps`
 * (`createdAt`/`updatedAt`), and `softDelete` (`deletedAt`) semantics. It does not
 * emit write-notifier events.
 */
export class InMemoryRepository<T extends object>
  implements
    OrmRepository<
      T,
      InMemoryFilter<T>,
      InMemoryFindOptions,
      InMemoryFindOptions,
      Partial<T>,
      Partial<T>,
      OrmEntityDocument<T>
    >
{
  private readonly documents: StoredDocument[] = [];
  private readonly _collectionName: string;
  private readonly timestamps: boolean;
  private readonly softDeleteEnabled: boolean;

  constructor(
    private readonly entityClass: DocumentClass<T>,
    options: InMemoryRepositoryOptions<T> = {},
  ) {
    this._collectionName = options.collectionName ?? defaultCollectionName(entityClass);
    this.timestamps = options.timestamps ?? true;
    this.softDeleteEnabled = options.softDelete ?? true;
    for (const doc of options.seed ?? []) {
      this.documents.push(this.prepareForInsert(doc));
    }
  }

  get collectionName(): string {
    return this._collectionName;
  }

  get entity(): DocumentClass<T> {
    return this.entityClass;
  }

  async find(
    filter: InMemoryFilter<T> = {},
    options: InMemoryFindOptions = {},
  ): Promise<Array<OrmEntityDocument<T>>> {
    let matched = this.documents.filter((doc) => this.matches(doc, filter, options.withDeleted));

    if (options.sort) {
      matched = this.sortDocuments(matched, options.sort);
    }
    if (options.skip) {
      matched = matched.slice(options.skip);
    }
    if (typeof options.limit === 'number') {
      matched = matched.slice(0, options.limit);
    }

    return matched.map((doc) => this.mapDocument(doc, options.projection));
  }

  async findOne(
    filter: InMemoryFilter<T> = {},
    options: InMemoryFindOptions = {},
  ): Promise<OrmEntityDocument<T> | null> {
    const [first] = await this.find(filter, { ...options, limit: 1 });
    return first ?? null;
  }

  async findById(id: unknown, options: InMemoryFindOptions = {}): Promise<OrmEntityDocument<T> | null> {
    return this.findOne(this.buildIdFilter(id), options);
  }

  async count(filter: InMemoryFilter<T> = {}, options: InMemoryFindOptions = {}): Promise<number> {
    return this.documents.filter((doc) => this.matches(doc, filter, options.withDeleted)).length;
  }

  async insertOne(doc: Partial<T>): Promise<OrmEntityDocument<T>> {
    const prepared = this.prepareForInsert(doc);
    this.documents.push(prepared);
    return this.mapDocument(prepared);
  }

  async insertMany(docs: Partial<T>[]): Promise<Array<OrmEntityDocument<T>>> {
    return Promise.all(docs.map((doc) => this.insertOne(doc)));
  }

  async save(entity: Partial<T> & { id?: string; _id?: unknown }): Promise<OrmEntityDocument<T>> {
    const identifier = entity.id ?? entity._id;

    if (identifier !== undefined && identifier !== null) {
      const existing = this.documents.find((doc) => this.matches(doc, this.buildIdFilter(identifier), true));
      if (!existing) {
        // Mirrors MongoRepository: an update that matches nothing then fails to reload.
        throw new Error('Failed to load entity after update');
      }
      const { id: _ignoredId, _id: _ignoredMongoId, ...rest } = entity;
      this.applyUpdate(existing, rest as Partial<T>);
      return this.mapDocument(existing);
    }

    return this.insertOne(entity);
  }

  async updateMany(filter: InMemoryFilter<T>, update: Partial<T>): Promise<number> {
    // Like MongoRepository, updateMany matches regardless of soft-delete state.
    const matched = this.documents.filter((doc) => this.matches(doc, filter, true));
    for (const doc of matched) {
      this.applyUpdate(doc, update);
    }
    return matched.length;
  }

  async softDelete(filter: InMemoryFilter<T>): Promise<number> {
    if (!this.softDeleteEnabled) {
      return this.removeMatching(filter);
    }
    const now = new Date();
    const matched = this.documents.filter((doc) => this.matches(doc, filter, true));
    for (const doc of matched) {
      doc.deletedAt = now;
      if (this.timestamps) {
        doc.updatedAt = now;
      }
    }
    return matched.length;
  }

  async restore(filter: InMemoryFilter<T>): Promise<number> {
    if (!this.softDeleteEnabled) {
      return 0;
    }
    const now = new Date();
    const matched = this.documents.filter((doc) => this.matches(doc, filter, true));
    for (const doc of matched) {
      doc.deletedAt = null;
      if (this.timestamps) {
        doc.updatedAt = now;
      }
    }
    return matched.length;
  }

  async deleteHard(filter: InMemoryFilter<T>): Promise<number> {
    return this.removeMatching(filter);
  }

  async deleteMany(filter: InMemoryFilter<T>): Promise<number> {
    return this.removeMatching(filter);
  }

  async exists(filter: InMemoryFilter<T> = {}, options: InMemoryFindOptions = {}): Promise<boolean> {
    return this.documents.some((doc) => this.matches(doc, filter, options.withDeleted));
  }

  async findOneOrFail(
    filter: InMemoryFilter<T> = {},
    options: InMemoryFindOptions = {},
  ): Promise<OrmEntityDocument<T>> {
    const found = await this.findOne(filter, options);
    if (!found) {
      throw new Error(`${this.entityClass.name} not found matching ${JSON.stringify(filter)}`);
    }
    return found;
  }

  async findByIdOrFail(id: unknown, options: InMemoryFindOptions = {}): Promise<OrmEntityDocument<T>> {
    return this.findOneOrFail(this.buildIdFilter(id), options);
  }

  async updateOne(
    filter: InMemoryFilter<T>,
    update: Partial<T>,
    options: InMemoryFindOptions = {},
  ): Promise<OrmEntityDocument<T> | null> {
    const existing = this.documents.find((doc) => this.matches(doc, filter, options.withDeleted));
    if (!existing) {
      return null;
    }
    this.applyUpdate(existing, update);
    return this.mapDocument(existing);
  }

  async increment(
    filter: InMemoryFilter<T>,
    field: string,
    by = 1,
    _options: InMemoryFindOptions = {},
  ): Promise<number> {
    const matched = this.documents.filter((doc) => this.matches(doc, filter, false));
    for (const doc of matched) {
      doc[field] = ((doc[field] as number) ?? 0) + by;
      if (this.timestamps) {
        doc.updatedAt = new Date();
      }
    }
    return matched.length;
  }

  async distinct<K = unknown>(
    field: string,
    filter: InMemoryFilter<T> = {},
    options: InMemoryFindOptions = {},
  ): Promise<K[]> {
    const values = this.documents
      .filter((doc) => this.matches(doc, filter, options.withDeleted))
      .map((doc) => getPath(doc, field));
    return [...new Set(values)] as K[];
  }

  async findAndCount(
    filter: InMemoryFilter<T> = {},
    options: InMemoryFindOptions = {},
  ): Promise<[Array<OrmEntityDocument<T>>, number]> {
    const [items, total] = await Promise.all([this.find(filter, options), this.count(filter, options)]);
    return [items, total];
  }

  // --- Test-only conveniences -------------------------------------------------

  /** Number of stored documents (including soft-deleted). */
  get size(): number {
    return this.documents.length;
  }

  /** Isolated clones of every stored document, for direct assertions. */
  snapshot(): Array<OrmEntityDocument<T>> {
    return this.documents.map((doc) => this.mapDocument(doc));
  }

  /** Remove every stored document. */
  clear(): void {
    this.documents.length = 0;
  }

  // --- Internals --------------------------------------------------------------

  private matches(doc: StoredDocument, filter: Record<string, unknown>, withDeleted?: boolean): boolean {
    if (!matchesFilter(doc, filter)) {
      return false;
    }
    if (this.softDeleteEnabled && !withDeleted) {
      return doc.deletedAt === null || doc.deletedAt === undefined;
    }
    return true;
  }

  private removeMatching(filter: Record<string, unknown>): number {
    let removed = 0;
    for (let i = this.documents.length - 1; i >= 0; i -= 1) {
      if (matchesFilter(this.documents[i]!, filter)) {
        this.documents.splice(i, 1);
        removed += 1;
      }
    }
    return removed;
  }

  private prepareForInsert(doc: Partial<T>): StoredDocument {
    const now = new Date();
    const prepared: StoredDocument = structuredClone(doc as Record<string, unknown>);

    const id = typeof prepared.id === 'string' && prepared.id.length > 0 ? prepared.id : generateId();
    prepared.id = id;
    prepared._id ??= id;

    if (this.timestamps) {
      prepared.createdAt ??= now;
      prepared.updatedAt ??= now;
    }
    if (this.softDeleteEnabled) {
      prepared.deletedAt ??= null;
    }

    return prepared;
  }

  private applyUpdate(doc: StoredDocument, update: Partial<T>): void {
    const patch = structuredClone(update as Record<string, unknown>);
    if (this.timestamps) {
      delete patch.createdAt;
    }
    for (const [key, value] of Object.entries(patch)) {
      if (key === 'id' || key === '_id') {
        continue;
      }
      if (value === undefined) {
        delete doc[key];
      } else {
        doc[key] = value;
      }
    }
    if (this.timestamps) {
      doc.updatedAt = new Date();
    }
  }

  private sortDocuments(docs: StoredDocument[], sort: Record<string, 1 | -1>): StoredDocument[] {
    const entries = Object.entries(sort);
    return [...docs].sort((a, b) => {
      for (const [key, direction] of entries) {
        const cmp = compareValues(getPath(a, key), getPath(b, key));
        if (cmp !== undefined && cmp !== 0) {
          return direction === 1 ? cmp : -cmp;
        }
      }
      return 0;
    });
  }

  private buildIdFilter(id: unknown): Record<string, unknown> {
    const normalized = String(id);
    return { $or: [{ id: normalized }, { _id: normalized }, { _id: id }] };
  }

  private mapDocument(doc: StoredDocument, projection?: Record<string, 0 | 1>): OrmEntityDocument<T> {
    const clone = structuredClone(doc) as StoredDocument & { id: string };
    if (!projection) {
      return clone as unknown as OrmEntityDocument<T>;
    }

    const entries = Object.entries(projection);
    const including = entries.some(([, flag]) => flag === 1);

    if (including) {
      const result: StoredDocument = {};
      for (const [key, flag] of entries) {
        if (flag === 1 && key in clone) {
          result[key] = clone[key];
        }
      }
      // `id` is returned unless explicitly excluded.
      if (projection.id !== 0) {
        result.id = clone.id;
      }
      return result as unknown as OrmEntityDocument<T>;
    }

    for (const [key, flag] of entries) {
      if (flag === 0) {
        delete clone[key];
      }
    }
    return clone as unknown as OrmEntityDocument<T>;
  }
}

/**
 * Build an {@link InMemoryRepository} that reads `timestamps`/`softDelete`/
 * `collection` from the entity's `@Document` metadata, so it faithfully mirrors
 * how the real repository would behave for that entity.
 *
 * Async because it lazily imports `@nl-framework/orm` (an optional peer) — the
 * `InMemoryRepository` constructor itself has no ORM runtime dependency, so you
 * can `new InMemoryRepository(Entity, { … })` directly when you already know the
 * options.
 */
export const createInMemoryRepository = async <T extends object>(
  entity: DocumentClass<T>,
  options: InMemoryRepositoryOptions<T> = {},
): Promise<InMemoryRepository<T>> => {
  const { getDocumentMetadata } = await import('@nl-framework/orm');
  const metadata = getDocumentMetadata(entity as DocumentClass<T & object>);
  return new InMemoryRepository<T>(entity, {
    collectionName: options.collectionName ?? metadata.collection,
    timestamps: options.timestamps ?? metadata.timestamps,
    softDelete: options.softDelete ?? metadata.softDelete,
    seed: options.seed,
  });
};
