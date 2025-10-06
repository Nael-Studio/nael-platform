import type { ExampleCatalogEntry } from '../../types';

export const graphqlExamples: ExampleCatalogEntry[] = [
  {
    id: 'graphql-resolver-crud',
    category: 'graphql',
    title: 'GraphQL Resolver with Queries and Mutations',
    description: 'Implements a resolver that exposes read/write operations using dependency-injected services.',
    code: `import { Resolver, Query, Mutation, Args } from '@nl-framework/graphql';
import { Injectable } from '@nl-framework/core';

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
    return post;
  }
}

@Resolver('Post')
export class PostsResolver {
  constructor(private readonly posts: PostsService) {}

  @Query(() => [String])
  posts() {
    return this.posts.list();
  }

  @Mutation(() => String)
  createPost(@Args('title') title: string) {
    return this.posts.create(title);
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
