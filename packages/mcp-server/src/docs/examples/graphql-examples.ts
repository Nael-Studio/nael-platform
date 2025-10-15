import type { ExampleCatalogEntry } from '../../types';

export const graphqlExamples: ExampleCatalogEntry[] = [
  {
    id: 'graphql-resolver-crud',
    category: 'graphql',
    title: 'GraphQL Resolver with Queries and Mutations',
  description: 'Implements a resolver that exposes read/write operations with validated DTO arguments.',
  code: `import { Resolver, Query, Mutation, Args, InputType, Field } from '@nl-framework/graphql';
import { Injectable } from '@nl-framework/core';
import { IsString, MinLength } from 'class-validator';

@Injectable()
class PostsService {
  private readonly posts = new Map<string, { id: string; title: string }>();

  list() {
    return Array.from(this.posts.values());
  }

  create(title: string) {
    const id = crypto.randomUUID();
    const post = { id, title };
    this.posts.set(id, post);
    return id;
  }
}

@InputType()
class CreatePostInput {
  @Field()
  @IsString()
  @MinLength(5)
  title!: string;
}

@Resolver('Post')
export class PostsResolver {
  constructor(private readonly posts: PostsService) {}

  @Query(() => [String])
  posts() {
    return this.posts.list();
  }

  @Mutation(() => String)
  createPost(@Args('input', () => CreatePostInput) input: CreatePostInput) {
    return this.posts.create(input.title);
  }
}
`,
    tags: ['graphql', 'resolver'],
    relatedPackages: ['@nl-framework/graphql', '@nl-framework/core'],
  },
  {
    id: 'graphql-auth-directive',
    category: 'graphql',
    title: 'Auth Directive Usage',
    description: 'Showcases the `@requireAuth` directive from the auth package.',
    code: `type Query {
  viewer: User @requireAuth
}
`,
    tags: ['graphql', 'auth'],
    relatedPackages: ['@nl-framework/auth'],
  },
  {
    id: 'graphql-register-enum-type',
    category: 'graphql',
    title: 'Register a TypeScript Enum',
    description: 'Expose a TypeScript enum via the GraphQL helper so decorators can reference it.',
    code: `import { registerEnumType } from '@nl-framework/graphql';

export enum Visibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

registerEnumType(Visibility, {
  name: 'Visibility',
  description: 'Controls access to a document.',
  valuesMap: {
    PUBLIC: { description: 'Available to everyone.' },
    PRIVATE: { description: 'Restricted to owners only.' },
  },
});
`,
    tags: ['graphql', 'enum'],
    relatedPackages: ['@nl-framework/graphql'],
  },
  {
    id: 'graphql-json-scalar',
    category: 'graphql',
    title: 'Return Arbitrary JSON',
    description: 'Use the bundled JSON scalar to return structured diagnostics data.',
    code: `import { Resolver, Query, GraphQLJSON } from '@nl-framework/graphql';

@Resolver('Diagnostics')
export class DiagnosticsResolver {
  @Query(() => GraphQLJSON)
  status() {
    return {
      ok: true,
      at: new Date().toISOString(),
      env: process.env.APP_ENV ?? 'local',
    };
  }
}
`,
    tags: ['graphql', 'scalar'],
    relatedPackages: ['@nl-framework/graphql'],
  },
  {
    id: 'graphql-abstract-type',
    category: 'graphql',
    title: 'Mark Base Types as Abstract',
    description: 'Share decorated fields between classes without emitting the base type in SDL.',
    code: `import { ObjectType, Field } from '@nl-framework/graphql';

@ObjectType({ isAbstract: true })
abstract class BaseModel {
  @Field()
  id!: string;
}

@ObjectType()
class Product extends BaseModel {
  @Field()
  name!: string;
}
`,
    explanation: '`isAbstract: true` keeps the `BaseModel` out of your schema while letting subclasses inherit its fields.',
    tags: ['graphql', 'object-type'],
    relatedPackages: ['@nl-framework/graphql'],
  },
];
