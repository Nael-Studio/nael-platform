# @nl-framework/orm

MongoDB-first ORM utilities for the NL Framework. This package provides TypeORM-inspired module registration helpers, metadata-driven repositories, and seeding utilities that plug into the core DI container.

## Installation

```bash
bun add @nl-framework/orm
```

## Quick start

Register the ORM connection at the root of your application:

```ts
import { Module } from '@nl-framework/core';
import { MongoOrmModule } from '@nl-framework/orm';

@Module({
  imports: [
    MongoOrmModule.forRoot({
      uri: process.env.MONGO_URI!,
      dbName: 'app-db',
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
  imports: [MongoOrmModule.forFeature([User])],
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

Inject a `MongoRepository` using the generated token helpers:

```ts
import { Inject } from '@nl-framework/core';
import { MongoRepository, getRepositoryToken } from '@nl-framework/orm';

export class UsersService {
  constructor(
    @Inject(getRepositoryToken(User))
    private readonly users: MongoRepository<User>,
  ) {}

  async listActive() {
    return this.users.find();
  }
}
```

Repositories provide familiar helpers (`find`, `findOne`, `insertOne`, `save`, `softDelete`, `restore`, etc.) and transparently handle timestamps and soft deletes.

## Seeding

Seeds run through the `SeedRunner`. Provide a list of seed classes via `MongoOrmModule.forRoot` and set `autoRunSeeds` to execute them on startup, or resolve the runner manually:

```ts
import { Seed, SeedContext } from '@nl-framework/orm';

@Seed('InitialUsers')
export class InitialUsersSeed {
  async run(context: SeedContext<'primary'>) {
    const users = context.getRepository(User);
    await users.insertMany([
      { email: 'admin@example.com', name: 'Admin' },
    ]);
  }
}
```

Each seed receives a typed context for resolving repositories bound to the same connection.
