import { Module } from '@nl-framework/core';
import { OrmModule } from '@nl-framework/orm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.document';
import './seeds/initial-users.seed';

@Module({
  imports: [OrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
