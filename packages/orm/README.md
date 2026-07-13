# @nl-framework/orm

Database-agnostic ORM utilities for the NL Framework with a MongoDB driver included. The package offers TypeORM-inspired module registration helpers, metadata-driven repositories, and seeding utilities that plug into the core DI container while leaving room for additional database drivers.

## Installation

```bash
bun add @nl-framework/orm
```

## Quick start

Register the ORM connection at the root of your application:

```ts
import { Module } from '@nl-framework/core';
import { OrmModule, createMongoDriver } from '@nl-framework/orm';

@Module({
  imports: [
    OrmModule.forRoot({
      driver: createMongoDriver({
        uri: process.env.MONGO_URI!,
        dbName: 'app-db',
      }),
      connectionName: 'primary',
      autoRunSeeds: true,
      seedEnvironment: process.env.APP_ENV ?? process.env.NODE_ENV ?? 'default',
    }),
  ],
})
export class AppModule {}
```

### Async configuration

For configuration modules that resolve database settings at runtime, use `OrmModule.forRootAsync`:

```ts
import { Module } from '@nl-framework/core';
import { ConfigModule, ConfigService } from '@nl-framework/config';
import { OrmModule, createMongoDriver } from '@nl-framework/orm';

@Module({
  imports: [
    ConfigModule,
    OrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get('database.mongo.uri');
        const dbName = config.get('database.mongo.dbName');
        return {
          driver: createMongoDriver({ uri, dbName }),
          autoRunSeeds: true,
        };
      },
    }),
  ],
})
export class AppModule {}
```

The async variant accepts `useFactory`, `useClass`, or `useExisting` patterns—mirroring other framework modules—so you can compose the ORM connection with any DI-managed configuration source.

Register repositories for feature modules:

```ts
@Module({
  imports: [OrmModule.forFeature([User])],
})
export class UsersModule {}
```

## Entities

Annotate MongoDB documents with the `@Document` decorator to control collection naming and behaviors.

```ts
import { Document } from '@nl-framework/orm';

@Document({ collection: 'users', timestamps: true, softDelete: true })
export class User {
  id?: string;
  _id?: ObjectId;
  email!: string;
  name!: string;
}
```

Timestamps automatically manage `createdAt`/`updatedAt` fields, while `softDelete` adds `deletedAt` support for repositories.

> **Portable identifiers.** Repositories expose an `id` string on every document and accept it for lookups and updates. The underlying Mongo `_id` field remains for database compatibility but is managed internally by the repository.

### Fields, hydration, validation & hooks

`@Prop()` captures field metadata that drives hydration, defaults, transforms, and
derived indexes. With `@Document({ hydrate: true })` (the default) reads return real
class instances — methods work. `@Document({ validate: true })` runs class-validator
on write paths (`insert*`/`save`/`bulkUpsert`).

```ts
import { Document, Prop, Version, BeforeInsert } from '@nl-framework/orm';
import { IsEmail } from 'class-validator';

@Document({ collection: 'users', timestamps: true, validate: true })
export class User {
  @Prop() name!: string;
  @Prop({ required: false }) nickname?: string;
  @Prop({ default: () => new Date() }) joinedAt!: Date;
  @Prop({ enum: Role, default: Role.User }) role!: Role;
  @Prop({ unique: true }) @IsEmail() email!: string;   // unique index derived from the shorthand
  @Prop({ index: true }) tenantId!: string;
  @Prop({ required: false, transform: { to: encrypt, from: decrypt } }) ssn?: string;
  @Version() version!: number;                          // optimistic locking

  @BeforeInsert() normalize() { this.email = this.email.toLowerCase(); }
}
```

- **Hydration**: `mapDocument` returns `plainToInstance(Entity, doc)`, applying `from`
  transforms and filling defaults. `ObjectId` identity is preserved. Set
  `@Document({ hydrate: false })` for the old plain-object behavior.
- **Transforms**: `to` runs on write (insert + update), `from` on read.
- **Derived indexes**: `@Prop({ unique })` / `@Prop({ index })` merge into the
  declarative index set, deduped against explicit `@Index`/`@Document({ indexes })`.
- **Lifecycle hooks**: `@BeforeInsert` / `@AfterInsert` / `@BeforeUpdate` /
  `@AfterUpdate` / `@BeforeDelete` / `@AfterDelete` run on hydrated instances,
  sequentially; a throw aborts the write. Before-hooks may mutate the entity and run
  before validation. **Bulk paths (`updateMany`, `updateOne`, `bulkWrite`,
  `bulkUpsert`) do not run per-entity hooks.**

### Relations & population

```ts
import { Ref, RefArray, Embedded, type Ref as RefT } from '@nl-framework/orm';

@Document({ collection: 'posts' })
class Post {
  @Ref(() => User) authorId!: RefT<User>;       // stored as ObjectId
  @RefArray(() => Tag) tagIds!: RefT<Tag>[];
  @Embedded(() => Address) address?: Address;    // subdocument, hydrated on read
}

const posts = await postRepo.find({}, { populate: ['authorId', 'tagIds'] });
// posts[0].authorId is now a hydrated User — one batched $in query per relation, no N+1.
```

Nested populate (`'authorId.orgId'`) is out of scope — one level only. For GraphQL
resolver batching, import `createEntityLoader(repo)` from `@nl-framework/orm/graphql`.

### Optimistic locking & change streams

`@Version()` marks a numeric field. `save()`/`updateOne` pin `{ version }` in the
filter and `$inc` it; a concurrent write throws `OptimisticLockException` (HTTP 409).
`repository.watch(pipeline?, options?)` streams hydrated change events (replica set
required); `repository.bridgeChangesToNotifier()` re-emits external writes into the
`WriteNotifier`.

### Read-through query cache

Opt-in per call, backed by a `CacheStore` passed to `createMongoDriver({ cache })`.
Never caches inside a transaction; any write to the collection invalidates its entries.

```ts
const active = await repo.find({ active: true }, { cache: { ttlMs: 30_000 } });
```

### Migrations

Reversible migrations mirror the seeding architecture. Register them on the module and
drive with the CLI:

```ts
OrmModule.forRoot({ driver, migrations: [AddUsersEmailIndexMigration] });
```

```bash
nl g migration add-users-email-index   # scaffold a timestamped migration
nl migrate up | down | status          # via nl-migrations.config.ts
```

Each migration runs in a transaction when the topology supports it; the runner refuses
to run when an applied migration's checksum changed.

### Named multi-connections

```ts
OrmModule.forRoot({ name: 'analytics', driver: analyticsDriver });
OrmModule.forFeature([User], 'analytics');

class Service {
  constructor(@InjectRepository(User, 'analytics') private readonly users: OrmRepository<User>) {}
}
```

Same entity class, isolated collections per connection. The default connection is
unchanged and backward compatible.

> **Auto-discovery.** The ORM automatically registers every decorated document that has been imported before `OrmModule.forRoot` executes. Provide the optional `entities` array only when you need to scope a connection to a specific subset.

## Repositories

Inject an `OrmRepository` (or the Mongo-specific implementation) using the generated token helpers:

```ts
import { Inject } from '@nl-framework/core';
import { getRepositoryToken, type OrmRepository } from '@nl-framework/orm';

export class UsersService {
  constructor(
    @Inject(getRepositoryToken(User))
    private readonly users: OrmRepository<User>,
  ) {}

  async listActive() {
    return this.users.find();
  }
}
```

Repositories provide familiar helpers (`find`, `findOne`, `insertOne`, `save`, `softDelete`, `restore`, etc.) and transparently handle timestamps and soft deletes.

### Convenience helpers

| Method | Notes |
| --- | --- |
| `exists(filter, opts?)` | `countDocuments` with `limit: 1`; soft-delete aware. |
| `findOneOrFail(filter, opts?)` | Throws `EntityNotFoundException` (`NOT_FOUND` → HTTP 404 / GraphQL `NOT_FOUND`) instead of returning `null`. |
| `findByIdOrFail(id, opts?)` | Id variant of the above. |
| `updateOne(filter, update, opts?)` | Atomic `findOneAndUpdate`; returns the mapped post-image or `null`. Soft-delete aware (`withDeleted` to include). |
| `increment(filter, field, by = 1, opts?)` | `$inc` on every match; returns `modifiedCount`, bumps `updatedAt`. |
| `distinct(field, filter?, opts?)` | Distinct values, soft-delete aware. |

`save()` on an existing entity is a single atomic `findOneAndUpdate` round trip
(no read-after-write race window).

### Aggregation & streaming

```ts
// Soft-delete `$match` is prepended automatically unless withDeleted is set.
const byStatus = await repo.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
for await (const row of repo.aggregateCursor([{ $project: { name: 1 } }])) { /* ... */ }

// Stream large result sets one hydrated document at a time.
for await (const doc of repo.findCursor({ active: true })) { /* ... */ }
```

> **Cursor caveat:** never hold a `findCursor` / `aggregateCursor` open across a
> transaction boundary — the session may be committed or aborted before
> iteration finishes. Materialize with `find()` inside a transaction instead.

### Pagination

```ts
const [items, total] = await repo.findAndCount({ active: true });

// Keyset (cursor) pagination — stable under writes, cheap at any depth.
let cursor: string | undefined;
do {
  const page = await repo.paginate({ active: true }, { limit: 20, cursor, sort: { createdAt: -1 } });
  process(page.items);
  cursor = page.nextCursor ?? undefined;
} while (cursor);
```

`paginate` uses keyset (not `skip`/`limit`): the opaque cursor encodes the last
item's sort-key values plus an `_id` tiebreaker and the sort itself. Reusing a
cursor under a changed `sort` is rejected. Default sort is `_id: 1`.

## Seeding

Decorate each seeder with `@Seed` to register metadata used by the automatic runner and history tracker:

```ts
import { Seed, type SeederContext } from '@nl-framework/orm';

@Seed({ name: 'initial-users', environments: ['development', 'test'] })
export class InitialUsersSeed {
  async run(context: SeederContext) {
    const users = await context.getRepository(User);
    await users.insertMany([
      { email: 'admin@example.com', name: 'Admin' },
    ]);
  }
}
```

- `name` becomes the stable seed identifier (defaults to the class name).
- `environments` limits execution to matching environments (case-insensitive); omit it to run everywhere.
- `connections` targets specific ORM connections when you run multiple databases.

When `autoRunSeeds` is `true`, the `SeedRunner` executes during module init, only running seeds that:

1. Match the current connection.
2. Match the resolved environment (`seedEnvironment` option, defaulting to `process.env.NODE_ENV ?? 'default'`).
3. Haven't already been recorded in the driver-provided seed history store.

The Mongo driver persists history in the same database (collection `orm_seed_history` by default), guaranteeing idempotent startups across deployments. You can still resolve the runner manually via `getSeedRunnerToken()` if you need to trigger seeds on demand.

> **Auto-discovery.** Seed classes decorated with `@Seed` are picked up automatically when their modules are imported. You can still pass an explicit `seeds` array to `OrmModule.forRoot` if you want to restrict execution to a subset.
