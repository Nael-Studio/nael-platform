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
      entities: [User],
      autoRunSeeds: true,
      seeds: [InitialUsersSeed],
    }),
  ],
})
export class AppModule {}
```

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
  _id?: ObjectId;
  email!: string;
  name!: string;
}
```

Timestamps automatically manage `createdAt`/`updatedAt` fields, while `softDelete` adds `deletedAt` support for repositories.

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

Seeds run through the `SeedRunner`. Provide a list of seed classes via `OrmModule.forRoot` and set `autoRunSeeds` to execute them on startup, or resolve the runner manually:

```ts
import type { SeederContext } from '@nl-framework/orm';

export class InitialUsersSeed {
  async run(context: SeederContext) {
    const users = await context.getRepository(User);
    await users.insertMany([
      { email: 'admin@example.com', name: 'Admin' },
    ]);
  }
}
```

Each seed receives a context for resolving repositories bound to the same connection. You can also resolve the `SeedRunner` manually via the `getSeedRunnerToken()` helper if you prefer to execute seeds outside of application bootstrap.
