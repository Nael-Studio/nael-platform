import { Module } from '@nl-framework/core';
import { OrmModule, createMongoDriver } from '@nl-framework/orm';
import { HealthModule, mongoIndicator, memoryIndicator } from '@nl-framework/health';
import { UsersModule } from './users/users.module';
import { AddUsersEmailIndexMigration } from './migrations/20260712000000-add-users-email-index.migration';

const DEFAULT_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/nl-framework-orm-example';
const DEFAULT_DB = process.env.MONGODB_DB ?? 'nl-framework-orm-example';

@Module({
  imports: [
    OrmModule.forRoot({
      driver: createMongoDriver({
        uri: DEFAULT_URI,
        dbName: DEFAULT_DB,
      }),
      autoRunSeeds: true,
      migrations: [AddUsersEmailIndexMigration],
    }),
    // Liveness at /healthz, readiness at /readyz. The Mongo indicator pings the
    // ORM connection (resolved as an optional injection). Keep these off public
    // ingress in production.
    HealthModule.forRoot({
      indicators: [
        mongoIndicator(),
        memoryIndicator({ maxRssBytes: 512 * 1024 * 1024 }),
      ],
    }),
    UsersModule,
  ],
})
export class AppModule {}
