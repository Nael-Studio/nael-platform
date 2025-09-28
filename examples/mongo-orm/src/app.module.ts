import { Module } from '@nl-framework/core';
import { OrmModule, createMongoDriver } from '@nl-framework/orm';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { User } from './users/user.document';
import { InitialUsersSeed } from './users/seeds/initial-users.seed';

const DEFAULT_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/nl-framework-orm-example';
const DEFAULT_DB = process.env.MONGODB_DB ?? 'nl-framework-orm-example';

@Module({
  imports: [
    OrmModule.forRoot({
      driver: createMongoDriver({
        uri: DEFAULT_URI,
        dbName: DEFAULT_DB,
      }),
      entities: [User],
      seeds: [InitialUsersSeed],
      autoRunSeeds: true,
    }),
    OrmModule.forFeature([User]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class AppModule {}
