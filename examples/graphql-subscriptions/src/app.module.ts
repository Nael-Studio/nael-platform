import { Module } from '@nl-framework/core';
import { ChatResolver } from './resolvers/chat.resolver';

@Module({
  resolvers: [ChatResolver],
})
export class AppModule {}
