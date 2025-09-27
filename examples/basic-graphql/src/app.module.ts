import { Module } from '@nl-framework/core';
import { BookService } from './services/book.service';
import { GreetingResolver } from './resolvers/greeting.resolver';
import { BookResolver } from './resolvers/book.resolver';

@Module({
  providers: [BookService],
  resolvers: [GreetingResolver, BookResolver],
})
export class AppModule {}
