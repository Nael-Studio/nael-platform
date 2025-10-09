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
