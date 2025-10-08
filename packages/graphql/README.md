# @nl-framework/graphql

Code-first GraphQL layer for the Nael Framework with resolver decorators, schema generation, and Apollo Federation support.

## Installation

```bash
bun add @nl-framework/graphql graphql
```

## Highlights

- **Resolver decorators** – annotate queries, mutations, subscriptions, and field resolvers with expressive decorators.
- **Schema tooling** – generate SDL from TypeScript metadata or stitch existing schemas with federation directives.
- **Module integration** – register resolvers alongside providers using standard Nael modules.

## Quick start

```ts
import { Module } from '@nl-framework/core';
import { Resolver, Query, Mutation, Args, InputType, Field } from '@nl-framework/graphql';
import { NaelFactory } from '@nl-framework/platform';

@InputType()
class CreateUserInput {
  @Field()
  email!: string;
}

@Resolver('User')
class UsersResolver {
  private readonly users = new Map<string, { id: string; email: string }>();

  @Query(() => [String])
  users() {
    return Array.from(this.users.values());
  }

  @Mutation(() => String)
  createUser(@Args('input', () => CreateUserInput) input: CreateUserInput) {
    const id = crypto.randomUUID();
    this.users.set(id, { id, email: input.email });
    return id;
  }
}

@Module({
  providers: [UsersResolver],
  resolvers: [UsersResolver],
})
class GraphqlModule {}

const app = await NaelFactory.create(GraphqlModule);
const { graphql } = await app.listen({ http: 4000 });
console.log('GraphQL ready at', graphql?.url ?? 'http://localhost:4000/graphql');
```

## License

Apache-2.0
