# 06 — Full ORM support track (`@nl-framework/orm` v2)

**Goal:** grow the repository layer into a real ODM. Sub-tasks 6a→6h build on each
other **in order**. Each sub-task is a separate PR.

## Context — read first
- `packages/orm/src/decorators/document.ts` — `@Document`, `@Index`, the module-
  level `documentRegistry`, `getRegisteredDocuments()`
- `packages/orm/src/interfaces/document.ts` — `DocumentMetadata` (extend it here)
- `packages/orm/src/repository/mongo-repository.ts` — `mapDocument`,
  `prepareForInsert/Update` are the hydration/write seams
- `packages/orm/src/module.ts` — `forRoot/forRootAsync/forFeature`; note
  `packages/orm/src/constants.ts` **already parameterizes every token by
  connection name** (`getConnectionToken(name)` etc.) — 6h is mostly module-level
  wiring, not token surgery
- `packages/orm/src/seeding/seed-runner.ts` + `drivers/mongo-seed-history-store.ts`
  — the pattern 6e (migrations) copies
- `packages/core/src/` validation utilities (`transformAndValidate`) for 6b
- `class-transformer` is already a core dependency (hydration in 6a)

## 6a — `@Prop()` field decorator + hydration

```ts
@Document({ collection: 'users', timestamps: true })
class User {
  @Prop() name!: string;
  @Prop({ required: false }) nickname?: string;
  @Prop({ default: () => new Date() }) joinedAt!: Date;
  @Prop({ enum: Role, default: Role.User }) role!: Role;
  @Prop({ unique: true }) email!: string;        // shorthand: unique index
  @Prop({ index: true }) tenantId!: string;      // shorthand: single-field index
  @Prop({ transform: { to: encrypt, from: decrypt } }) ssn?: string;
}
```

- Store `PropMetadata[]` (name, designType via `reflect-metadata`
  `design:type`, required, default, enum, unique, index, transform) on
  `DocumentMetadata.props`. `emitDecoratorMetadata` is already on (verify
  `tsconfig.base.json`).
- **Hydration:** `mapDocument` returns `plainToInstance(EntityClass, doc)` so
  results are real class instances (methods work). Apply `from` transforms +
  default filling. Gate behind `@Document({ hydrate: true })` defaulting to
  **true in 0.5** with a release-notes migration note (plain objects were never a
  documented contract, but flag it).
- **Writes:** apply `to` transforms and defaults in `prepareForInsert`.
- **Index derivation:** merge prop-level `unique`/`index` shorthands into the
  metadata `indexes` array consumed by the existing declarative index sync —
  dedupe against explicitly declared indexes.
- Tests: metadata capture, hydration returns instanceof, defaults, enum
  passthrough, transform round-trip, derived indexes merged + deduped.

## 6b — Validation on write
`@Document({ validate: true })` → `insertOne/insertMany/save/bulkUpsert` run core
`transformAndValidate` (class-validator) before hitting the driver; failures throw
the framework's `ValidationException` (same shape HTTP pipes produce). Off by
default. Skip fields without decorators. Tests: pass, fail (error shape), off.

## 6c — Entity lifecycle hooks
`@BeforeInsert() / @AfterInsert() / @BeforeUpdate() / @AfterUpdate() /
@BeforeDelete() / @AfterDelete()` — instance methods collected into
`DocumentMetadata.hooks`. Requires 6a hydration (hooks run on instances).
- Before-hooks may mutate the entity (password hashing use case); they run
  before validation (6b) and before `prepareForInsert/Update`.
- `updateMany`/`bulkWrite`/`bulkUpsert` do **not** run per-entity hooks — document
  this loudly in the README (matches TypeORM semantics).
- Async hooks awaited sequentially; a throw aborts the write.
- Tests: mutation visible in persisted doc, ordering (hooks → validate → write →
  after-hooks → notifier), bulk paths skip hooks.

## 6d — Relations & population

```ts
class Post {
  @Ref(() => User) authorId!: Ref<User>;          // stores ObjectId
  @RefArray(() => Tag) tagIds!: Ref<Tag>[];
  @Embedded(() => Address) address?: Address;      // subdocument, hydrated via 6a
}
const posts = await postRepo.find({}, { populate: ['authorId'] });
// posts[0].authorId is now a hydrated User (typed via Populated<Post, 'authorId'>)
```

- Population = collect distinct ids across the result set → single `$in` query per
  relation → stitch. **Never** per-document queries (no N+1).
- Nested populate (`'authorId.orgId'`) is **out of scope** — one level only.
- Cross-collection lookups go through the repository of the target document
  (resolved via the registry + connection name).
- GraphQL: export a `createEntityLoader(repo)` DataLoader-style helper from a new
  `@nl-framework/orm` subpath for resolver batching (no hard dep on graphql pkg).
- Tests: single/array populate batching (assert exactly one find per relation),
  missing targets → null with warning log, embedded hydration.

## 6e — Migrations
Mirror the seeding architecture (`SeedRunner`, history store):
- `Migration` interface `{ name: string; up(ctx): Promise<void>; down(ctx):
  Promise<void> }` with `ctx = { db, session, logger }`; discovered via
  `OrmModule.forRoot({ migrations: [...] })` or glob path.
- `MigrationRunner` service + history collection `_nl_migrations`
  (name, appliedAt, durationMs, checksum of file content; refuse to run when an
  applied migration's checksum changed).
- Runs in a transaction per migration when the topology supports it (replica
  set); otherwise warn and run without.
- CLI (`packages/cli`): `nl migrate up|down|status` and generator
  `nl g migration <name>` producing a timestamped file from a template.
- Tests: ordering, idempotence (second `up` is a no-op), down reverses, checksum
  mismatch refusal, status output.

## 6f — Optimistic locking + change streams
- `@Version()` marks a numeric field; `save()`/`updateOne` add `{version: current}`
  to the filter and `$inc: {version: 1}`; no match + doc exists →
  `OptimisticLockException`.
- `repository.watch(filter?, options?): AsyncIterable<ChangeEvent<T>>` over Mongo
  change streams (hydrated via 6a); document replica-set requirement; feed an
  opt-in bridge that re-emits into `WriteNotifier` so external writes surface.
- Tests: version conflict throw, increment on success; watch tested against a
  mocked stream.

## 6g — Read-through query cache
Opt-in per call: `find(filter, { cache: { ttlMs, key? } })`. Backed by the core
`CacheStore` (in-memory/Redis) injected via a new optional ORM module option.
Invalidation: write notifier events drop all cached entries for that collection
(coarse, correct; per-key invalidation out of scope). Never cache when a
`session` (transaction) is present. Tests: hit/miss, write invalidates, session
bypass.

## 6h — Named multi-connections
Tokens already accept a name (`constants.ts`). Wire it through:
`OrmModule.forRoot({ name: 'analytics', ... })`, `forFeature([Doc],
'analytics')`, `@InjectRepository(Doc, 'analytics')` (add the decorator if it
doesn't exist — check `packages/orm/src/module.ts` for how repositories inject
today). Documents may register under multiple connections; the document registry
becomes connection-aware only at repository-provider level (metadata stays
global). Tests: two connections, same entity class, isolated collections; default
name backward compatible.

## Definition of done (track-level)
- `examples/mongo-orm` updated to showcase @Prop, hooks, populate, one migration.
- `packages/orm/README.md` + docs-site ORM page rewritten for the new surface.
- No breaking changes to existing public methods except documented hydration.
