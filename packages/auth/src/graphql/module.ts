import { Module } from '@nl-framework/core';
import { AuthResolver } from './resolvers/auth.resolver';

@Module({
  providers: [AuthResolver],
  resolvers: [AuthResolver],
})
export class BetterAuthGraphqlModule {}
