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
];
