import { Injectable } from '@nl-framework/core';
import { Resolver, Query, Arg } from '@nl-framework/graphql';
import { Greeting } from '../models/greeting.model';

@Injectable()
@Resolver(() => Greeting)
export class GreetingResolver {
  @Query(() => Greeting, { description: 'Returns a personalized welcome message.' })
  hello(@Arg('name') name: string): Greeting {
    return {
      message: `Hello, ${name}! Welcome to nl-framework GraphQL.`,
      timestamp: Date.now(),
    };
  }
}
