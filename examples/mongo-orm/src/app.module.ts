import { Module } from '@nl-framework/core';
import { OrmModule, createMongoDriver } from '@nl-framework/orm';
import { UsersModule } from './users/users.module';

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
    }),
    UsersModule,
  ],
})
export class AppModule {}
