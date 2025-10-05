import { PackageDocumentation } from '../../types.js';

export const graphqlPackageDocs: PackageDocumentation = {
  name: '@nl-framework/graphql',
  description: 'GraphQL integration for NL Framework with schema-first and code-first approaches, built on top of Apollo Server',
  version: '1.0.0',
  installation: 'bun add @nl-framework/graphql @nl-framework/core',
  
  features: [
    {
      title: 'Apollo Server Integration',
      description: 'Built on Apollo Server with Express integration for GraphQL APIs',
      icon: '🚀'
    },
    {
      title: 'Schema-First & Code-First',
      description: 'Support for both schema-first (SDL) and code-first development approaches',
      icon: '📝'
    },
    {
      title: 'Decorator-Based Resolvers',
      description: 'Define resolvers using @Query, @Mutation, @Subscription, and @ResolveField',
      icon: '🎯'
    },
    {
      title: 'Real-time Subscriptions',
      description: 'WebSocket support for real-time data updates with pub/sub pattern',
      icon: '⚡'
    },
    {
      title: 'DataLoader Integration',
      description: 'Built-in support for DataLoader to prevent N+1 query problems',
      icon: '📊'
    },
    {
      title: 'Guards & Interceptors',
      description: 'Authentication and authorization with reusable guards',
      icon: '🛡️'
    }
  ],
  
  quickStart: {
    description: 'Create a GraphQL API with resolvers',
    steps: [
      'Install dependencies: bun add @nl-framework/graphql @nl-framework/core',
      'Create a GraphQL schema file (schema.graphql)',
      'Create a resolver class with @Resolver decorator',
      'Add queries and mutations with decorators',
      'Register GraphQLModule in your app module'
    ],
    code: `// schema.graphql
type Query {
  user(id: ID!): User
  users: [User!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
}

type User {
  id: ID!
  name: String!
  email: String!
}

input CreateUserInput {
  name: String!
  email: String!
}

// user.resolver.ts
import { Resolver, Query, Mutation, Args } from '@nl-framework/graphql';

@Resolver('User')
export class UserResolver {
  @Query()
  async user(@Args('id') id: string) {
    return { id, name: 'John Doe', email: 'john@example.com' };
  }

  @Query()
  async users() {
    return [
      { id: '1', name: 'Alice', email: 'alice@example.com' },
      { id: '2', name: 'Bob', email: 'bob@example.com' }
    ];
  }

  @Mutation()
  async createUser(@Args('input') input: any) {
    return { id: '123', ...input };
  }
}

// app.module.ts
import { Module } from '@nl-framework/core';
import { GraphQLModule } from '@nl-framework/graphql';

@Module({
  imports: [
    GraphQLModule.forRoot({
      typeDefs: './schema.graphql',
      resolvers: [UserResolver],
      playground: true
    })
  ]
})
export class AppModule {}`
  },
  
  api: {
    decorators: [
      {
        name: '@Resolver',
        signature: '@Resolver(typeName?: string)',
        parameters: [
          {
            name: 'typeName',
            type: 'string',
            description: 'The GraphQL type this resolver handles (e.g., "User", "Post"). If omitted, uses the class name.',
            required: false
          }
        ],
        description: 'Marks a class as a GraphQL resolver. The resolver handles queries, mutations, and subscriptions for a specific type.',
        examples: [
          '@Resolver(\'User\')',
          '@Resolver()',
          '@Resolver(\'Post\')'
        ],
        package: '@nl-framework/graphql'
      },
      {
        name: '@Query',
        signature: '@Query(name?: string)',
        parameters: [
          {
            name: 'name',
            type: 'string',
            description: 'The query name in the schema. If omitted, uses the method name.',
            required: false
          }
        ],
        description: 'Marks a method as a GraphQL query resolver. Queries are used for fetching data (read operations).',
        examples: [
          '@Query()',
          '@Query(\'getUser\')',
          '@Query(\'findUserById\')'
        ],
        package: '@nl-framework/graphql'
      },
      {
        name: '@Mutation',
        signature: '@Mutation(name?: string)',
        parameters: [
          {
            name: 'name',
            type: 'string',
            description: 'The mutation name in the schema. If omitted, uses the method name.',
            required: false
          }
        ],
        description: 'Marks a method as a GraphQL mutation resolver. Mutations are used for modifying data (create, update, delete operations).',
        examples: [
          '@Mutation()',
          '@Mutation(\'createUser\')',
          '@Mutation(\'updateProfile\')'
        ],
        package: '@nl-framework/graphql'
      },
      {
        name: '@Subscription',
        signature: '@Subscription(name?: string, options?: SubscriptionOptions)',
        parameters: [
          {
            name: 'name',
            type: 'string',
            description: 'The subscription name in the schema. If omitted, uses the method name.',
            required: false
          },
          {
            name: 'options',
            type: 'SubscriptionOptions',
            description: 'Options including filter, resolve functions for subscription',
            required: false
          }
        ],
        description: 'Marks a method as a GraphQL subscription resolver. Subscriptions allow clients to receive real-time updates via WebSockets.',
        examples: [
          '@Subscription()',
          '@Subscription(\'messageAdded\')',
          '@Subscription(\'notificationReceived\', { filter: (payload, vars) => payload.userId === vars.userId })'
        ],
        package: '@nl-framework/graphql'
      },
      {
        name: '@ResolveField',
        signature: '@ResolveField(fieldName?: string)',
        parameters: [
          {
            name: 'fieldName',
            type: 'string',
            description: 'The field name to resolve. If omitted, uses the method name.',
            required: false
          }
        ],
        description: 'Marks a method as a field resolver. Field resolvers compute the value of a specific field on a type, often used for nested data or computed fields.',
        examples: [
          '@ResolveField(\'posts\')',
          '@ResolveField(\'totalPosts\')',
          '@ResolveField(\'friends\')'
        ],
        package: '@nl-framework/graphql'
      },
      {
        name: '@Args',
        signature: '@Args(name?: string, options?: ArgOptions)',
        parameters: [
          {
            name: 'name',
            type: 'string',
            description: 'The argument name. If omitted, uses the parameter name.',
            required: false
          },
          {
            name: 'options',
            type: 'ArgOptions',
            description: 'Options like nullable, defaultValue, validation',
            required: false
          }
        ],
        description: 'Injects GraphQL arguments into resolver method parameters. Used to extract query/mutation/subscription arguments.',
        examples: [
          '@Args(\'id\')',
          '@Args(\'input\')',
          '@Args(\'limit\', { nullable: true, defaultValue: 10 })'
        ],
        package: '@nl-framework/graphql'
      },
      {
        name: '@Ctx',
        signature: '@Ctx(property?: string)',
        parameters: [
          {
            name: 'property',
            type: 'string',
            description: 'Specific property to extract from context (e.g., "user", "req"). If omitted, injects the entire context.',
            required: false
          }
        ],
        description: 'Injects the GraphQL context into resolver method parameters. The context typically contains request information, current user, dataloaders, etc.',
        examples: [
          '@Ctx()',
          '@Ctx(\'user\')',
          '@Ctx(\'req\')'
        ],
        package: '@nl-framework/graphql'
      },
      {
        name: '@Parent',
        signature: '@Parent(property?: string)',
        parameters: [
          {
            name: 'property',
            type: 'string',
            description: 'Specific property to extract from parent. If omitted, injects the entire parent object.',
            required: false
          }
        ],
        description: 'Injects the parent object into field resolver parameters. Used in field resolvers to access the parent object being resolved.',
        examples: [
          '@Parent()',
          '@Parent(\'id\')',
          '@Parent(\'userId\')'
        ],
        package: '@nl-framework/graphql'
      },
      {
        name: '@UseGuards',
        signature: '@UseGuards(...guards: Type<Guard>[])',
        parameters: [
          {
            name: 'guards',
            type: 'Type<Guard>[]',
            description: 'One or more guard classes to apply for authentication and authorization',
            required: true
          }
        ],
        description: 'Applies guards to GraphQL resolvers for authentication and authorization. Guards run before the resolver method.',
        examples: [
          '@UseGuards(AuthGuard)',
          '@UseGuards(AuthGuard, RolesGuard)',
          '@UseGuards(AuthGuard, OwnershipGuard)'
        ],
        package: '@nl-framework/graphql'
      },
      {
        name: '@UseInterceptors',
        signature: '@UseInterceptors(...interceptors: Type<Interceptor>[])',
        parameters: [
          {
            name: 'interceptors',
            type: 'Type<Interceptor>[]',
            description: 'One or more interceptor classes to apply for cross-cutting concerns',
            required: true
          }
        ],
        description: 'Applies interceptors to GraphQL resolvers for cross-cutting concerns like logging, caching, transformation.',
        examples: [
          '@UseInterceptors(LoggingInterceptor)',
          '@UseInterceptors(CacheInterceptor)',
          '@UseInterceptors(LoggingInterceptor, TransformInterceptor)'
        ],
        package: '@nl-framework/graphql'
      }
    ],
    
    classes: [
      {
        name: 'GraphQLModule',
        description: 'The main module for configuring GraphQL with Apollo Server integration',
        package: '@nl-framework/graphql',
        constructor: {
          parameters: []
        },
        methods: [
          {
            name: 'forRoot',
            signature: 'static forRoot(options: GraphQLModuleOptions): DynamicModule',
            description: 'Configure GraphQL module for the root application',
            parameters: [
              {
                name: 'options',
                type: 'GraphQLModuleOptions',
                description: 'Configuration options including typeDefs, resolvers, context, playground settings'
              }
            ],
            returns: 'DynamicModule'
          },
          {
            name: 'forRootAsync',
            signature: 'static forRootAsync(options: GraphQLModuleAsyncOptions): DynamicModule',
            description: 'Configure GraphQL module asynchronously (e.g., for config service)',
            parameters: [
              {
                name: 'options',
                type: 'GraphQLModuleAsyncOptions',
                description: 'Async configuration options with factory function'
              }
            ],
            returns: 'DynamicModule'
          }
        ],
        examples: [
          `GraphQLModule.forRoot({
  typeDefs: './schema.graphql',
  resolvers: [UserResolver, PostResolver],
  playground: true
})`,
          `GraphQLModule.forRoot({
  typeDefs: './schema.graphql',
  resolvers: [UserResolver],
  context: ({ req }) => ({
    user: req.user,
    dataloaders: createDataLoaders()
  })
})`
        ]
      },
      {
        name: 'PubSub',
        description: 'Publish-subscribe system for GraphQL subscriptions. Allows publishing events and subscribing to them.',
        package: '@nl-framework/graphql',
        constructor: {
          parameters: []
        },
        methods: [
          {
            name: 'publish',
            signature: 'async publish(triggerName: string, payload: any): Promise<void>',
            description: 'Publish an event to subscribers',
            parameters: [
              {
                name: 'triggerName',
                type: 'string',
                description: 'The event name/channel'
              },
              {
                name: 'payload',
                type: 'any',
                description: 'The event payload to send to subscribers'
              }
            ],
            returns: 'Promise<void>'
          },
          {
            name: 'asyncIterator',
            signature: 'asyncIterator<T>(triggers: string | string[]): AsyncIterator<T>',
            description: 'Create an async iterator for subscription',
            parameters: [
              {
                name: 'triggers',
                type: 'string | string[]',
                description: 'Event name(s) to subscribe to'
              }
            ],
            returns: 'AsyncIterator<T>'
          }
        ],
        examples: [
          `// Publishing
await this.pubSub.publish('NOTIFICATION_ADDED', {
  notificationAdded: { userId: '123', message: 'Hello!' }
});`,
          `// Subscribing
@Subscription()
notificationAdded() {
  return this.pubSub.asyncIterator('NOTIFICATION_ADDED');
}`
        ]
      }
    ],
    
    interfaces: [
      {
        name: 'GraphQLModuleOptions',
        description: 'Configuration options for the GraphQL module',
        package: '@nl-framework/graphql',
        properties: [
          {
            name: 'typeDefs',
            type: 'string | DocumentNode | DocumentNode[]',
            description: 'GraphQL schema definition (file path or inline SDL)',
            required: false
          },
          {
            name: 'resolvers',
            type: 'any[]',
            description: 'Array of resolver classes',
            required: false
          },
          {
            name: 'context',
            type: '(context: any) => any | Promise<any>',
            description: 'Function to create GraphQL context for each request',
            required: false
          },
          {
            name: 'playground',
            type: 'boolean',
            description: 'Enable GraphQL playground (default: true in dev)',
            required: false
          },
          {
            name: 'introspection',
            type: 'boolean',
            description: 'Enable schema introspection (default: true in dev)',
            required: false
          },
          {
            name: 'path',
            type: 'string',
            description: 'GraphQL endpoint path (default: /graphql)',
            required: false
          },
          {
            name: 'subscriptions',
            type: 'SubscriptionOptions',
            description: 'WebSocket subscription configuration',
            required: false
          }
        ],
        examples: [
          `{
  typeDefs: './schema.graphql',
  resolvers: [UserResolver],
  playground: true,
  introspection: true
}`,
          `{
  typeDefs: './schema.graphql',
  resolvers: [UserResolver],
  context: ({ req }) => ({ user: req.user }),
  subscriptions: {
    'subscriptions-transport-ws': {
      onConnect: (params) => ({ user: verifyToken(params.authToken) })
    }
  }
}`
        ]
      }
    ]
  },
  
  examples: [
    {
      title: 'Complete GraphQL CRUD API',
      description: 'Full implementation of a GraphQL API with queries, mutations, and field resolvers',
      code: `// schema.graphql
type Query {
  users(limit: Int, offset: Int): [User!]!
  user(id: ID!): User
  posts: [Post!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}

type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
  createdAt: String!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
  createdAt: String!
}

input CreateUserInput {
  name: String!
  email: String!
}

input UpdateUserInput {
  name: String
  email: String
}

// user.resolver.ts
import { Resolver, Query, Mutation, ResolveField, Args, Parent } from '@nl-framework/graphql';

@Resolver('User')
export class UserResolver {
  constructor(
    private userService: UserService,
    private postService: PostService
  ) {}

  @Query()
  async users(
    @Args('limit', { nullable: true, defaultValue: 10 }) limit: number,
    @Args('offset', { nullable: true, defaultValue: 0 }) offset: number
  ) {
    return this.userService.findAll({ limit, offset });
  }

  @Query()
  async user(@Args('id') id: string) {
    const user = await this.userService.findById(id);
    if (!user) throw new Error('User not found');
    return user;
  }

  @Mutation()
  async createUser(@Args('input') input: any) {
    return this.userService.create(input);
  }

  @Mutation()
  async updateUser(
    @Args('id') id: string,
    @Args('input') input: any
  ) {
    return this.userService.update(id, input);
  }

  @Mutation()
  async deleteUser(@Args('id') id: string) {
    await this.userService.delete(id);
    return true;
  }

  @ResolveField('posts')
  async posts(@Parent() user: any) {
    return this.postService.findByUserId(user.id);
  }
}

// app.module.ts
import { Module } from '@nl-framework/core';
import { GraphQLModule } from '@nl-framework/graphql';

@Module({
  imports: [
    GraphQLModule.forRoot({
      typeDefs: './schema.graphql',
      resolvers: [UserResolver],
      playground: true
    })
  ]
})
export class AppModule {}`,
      tags: ['graphql', 'crud', 'resolvers'],
      explanation: 'Complete CRUD operations with queries, mutations, and field resolvers'
    },
    {
      title: 'Real-time Subscriptions',
      description: 'Implement real-time subscriptions using WebSockets and PubSub',
      code: `// schema.graphql
type Subscription {
  messageAdded(roomId: ID!): Message!
  notificationAdded: Notification!
}

type Message {
  id: ID!
  content: String!
  roomId: ID!
  userId: ID!
  createdAt: String!
}

// message.resolver.ts
import { Resolver, Subscription, Mutation, Args, Ctx } from '@nl-framework/graphql';
import { PubSub } from '@nl-framework/graphql';
import { UseGuards } from '@nl-framework/graphql';
import { AuthGuard } from './auth.guard';

@Resolver()
export class MessageResolver {
  constructor(private pubSub: PubSub) {}

  @Mutation()
  @UseGuards(AuthGuard)
  async sendMessage(
    @Args('roomId') roomId: string,
    @Args('content') content: string,
    @Ctx('user') user: any
  ) {
    const message = {
      id: generateId(),
      content,
      roomId,
      userId: user.id,
      createdAt: new Date().toISOString()
    };

    // Publish to subscribers
    await this.pubSub.publish(\`MESSAGE_\${roomId}\`, {
      messageAdded: message
    });

    return message;
  }

  @Subscription('messageAdded', {
    filter: (payload, variables) => {
      return payload.messageAdded.roomId === variables.roomId;
    }
  })
  @UseGuards(AuthGuard)
  messageAdded(@Args('roomId') roomId: string) {
    return this.pubSub.asyncIterator(\`MESSAGE_\${roomId}\`);
  }
}

// app.module.ts
@Module({
  imports: [
    GraphQLModule.forRoot({
      typeDefs: './schema.graphql',
      resolvers: [MessageResolver],
      subscriptions: {
        'subscriptions-transport-ws': {
          onConnect: (params: any) => ({
            user: verifyToken(params.authToken)
          })
        }
      }
    })
  ]
})
export class AppModule {}`,
      tags: ['graphql', 'subscriptions', 'realtime', 'websocket'],
      explanation: 'Real-time messaging with WebSocket subscriptions and pub/sub pattern'
    },
    {
      title: 'DataLoader N+1 Query Prevention',
      description: 'Use DataLoader to batch and cache database queries, preventing N+1 problems',
      code: `// dataloaders.ts
import DataLoader from 'dataloader';

export function createDataLoaders(userService, postService) {
  const userLoader = new DataLoader(async (userIds) => {
    const users = await userService.findByIds(userIds);
    const userMap = new Map(users.map(u => [u.id, u]));
    return userIds.map(id => userMap.get(id));
  });

  const postsByUserLoader = new DataLoader(async (userIds) => {
    const posts = await postService.findByUserIds(userIds);
    const postsByUser = new Map();
    
    posts.forEach(post => {
      if (!postsByUser.has(post.authorId)) {
        postsByUser.set(post.authorId, []);
      }
      postsByUser.get(post.authorId).push(post);
    });

    return userIds.map(id => postsByUser.get(id) || []);
  });

  return { userLoader, postsByUserLoader };
}

// app.module.ts
GraphQLModule.forRoot({
  typeDefs: './schema.graphql',
  resolvers: [UserResolver, PostResolver],
  context: ({ req }) => ({
    user: req.user,
    dataloaders: createDataLoaders(userService, postService)
  })
})

// user.resolver.ts
@Resolver('User')
export class UserResolver {
  @ResolveField('posts')
  async posts(@Parent() user: any, @Ctx() ctx: any) {
    // Batches multiple requests into one database query
    return ctx.dataloaders.postsByUserLoader.load(user.id);
  }
}

// post.resolver.ts
@Resolver('Post')
export class PostResolver {
  @ResolveField('author')
  async author(@Parent() post: any, @Ctx() ctx: any) {
    // Batches multiple user fetches into one query
    return ctx.dataloaders.userLoader.load(post.authorId);
  }
}`,
      tags: ['graphql', 'dataloader', 'optimization', 'performance'],
      explanation: 'Prevent N+1 queries by batching database requests with DataLoader'
    },
    {
      title: 'Authentication and Authorization',
      description: 'Implement authentication guards and role-based access control in GraphQL',
      code: `// auth.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nl-framework/core';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = context.getArgs()[2]; // GraphQL context
    if (!ctx.user) {
      throw new Error('Unauthorized - Please login');
    }
    return true;
  }
}

// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = context.getArgs()[2];
    const requiredRoles = context.getHandler().metadata?.roles || [];
    
    if (!requiredRoles.length) return true;
    
    return requiredRoles.some(role => ctx.user.roles?.includes(role));
  }
}

// user.resolver.ts
@Resolver()
export class UserResolver {
  // Public query - no authentication
  @Query()
  async publicUsers() {
    return this.userService.findPublic();
  }

  // Requires authentication
  @Query()
  @UseGuards(AuthGuard)
  async me(@Ctx('user') user: any) {
    return user;
  }

  // Requires admin role
  @Query()
  @UseGuards(AuthGuard, RolesGuard)
  async allUsers(@Ctx('user') user: any) {
    if (!user.roles.includes('admin')) {
      throw new Error('Forbidden - Admin only');
    }
    return this.userService.findAll();
  }

  // Only admins can delete users
  @Mutation()
  @UseGuards(AuthGuard, RolesGuard)
  async deleteUser(@Args('id') id: string, @Ctx('user') user: any) {
    if (!user.roles.includes('admin')) {
      throw new Error('Forbidden - Admin only');
    }
    await this.userService.delete(id);
    return true;
  }
}

// app.module.ts
GraphQLModule.forRoot({
  context: ({ req }) => ({
    user: req.user ? verifyToken(req.user) : null,
    req
  })
})`,
      tags: ['graphql', 'authentication', 'authorization', 'guards'],
      explanation: 'Secure GraphQL resolvers with authentication guards and role-based access control'
    }
  ],
  
  bestPractices: [
    {
      category: 'Schema Design',
      do: [
        {
          title: 'Use meaningful type and field names',
          description: 'Type and field names should be clear and follow GraphQL conventions (PascalCase for types, camelCase for fields)',
          code: `type User {
  id: ID!
  firstName: String!
  email: String!
  createdAt: DateTime!
}`
        },
        {
          title: 'Design for nullability carefully',
          description: 'Only use non-null (!) when you can guarantee the field will always have a value',
          code: `type User {
  id: ID!          # Always present
  name: String!    # Always present
  bio: String      # Optional
}`
        },
        {
          title: 'Use input types for complex arguments',
          description: 'For mutations with multiple arguments, use input types',
          code: `input CreateUserInput {
  name: String!
  email: String!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
}`
        }
      ],
      dont: [
        {
          title: 'Avoid cryptic field names',
          description: 'Don\'t use abbreviated or unclear field names',
          code: `type usr {
  i: ID!
  fn: String!
  e: String!
}`
        },
        {
          title: 'Don\'t mark optional fields as non-null',
          description: 'This can cause unexpected null errors',
          code: `type User {
  bio: String!         # May not always exist
  avatarUrl: String!   # May not always exist
}`
        },
        {
          title: 'Don\'t use too many individual arguments',
          description: 'This makes the API harder to use and evolve',
          code: `type Mutation {
  createUser(
    name: String!
    email: String!
    password: String!
    age: Int
    country: String
  ): User!
}`
        }
      ]
    },
    {
      category: 'Resolver Performance',
      do: [
        {
          title: 'Use DataLoader to prevent N+1 queries',
          description: 'Always use DataLoader for batching database queries in field resolvers',
          code: `@ResolveField('author')
async author(@Parent() post: any, @Ctx() ctx: any) {
  return ctx.dataloaders.userLoader.load(post.authorId);
}`
        },
        {
          title: 'Implement pagination for lists',
          description: 'Always paginate list queries to prevent performance issues',
          code: `@Query()
async users(
  @Args('limit', { defaultValue: 10 }) limit: number,
  @Args('offset', { defaultValue: 0 }) offset: number
) {
  return this.userService.findAll({ limit, offset });
}`
        },
        {
          title: 'Return simple fields directly from parent',
          description: 'Don\'t create field resolvers for simple data that\'s already on the parent object',
          code: `@Query()
async user(@Args('id') id: string) {
  // Return all simple fields directly
  return {
    id: '123',
    name: 'Alice',
    email: 'alice@example.com'
  };
}`
        }
      ],
      dont: [
        {
          title: 'Don\'t make separate queries in field resolvers',
          description: 'This causes N+1 query problems',
          code: `@ResolveField('author')
async author(@Parent() post: any) {
  // Makes a query for each post!
  return this.userService.findById(post.authorId);
}`
        },
        {
          title: 'Don\'t return all records without pagination',
          description: 'This can cause timeouts and memory issues',
          code: `@Query()
async users() {
  // Returns all users - could be millions
  return this.userService.findAll();
}`
        },
        {
          title: 'Don\'t create unnecessary field resolvers',
          description: 'This adds overhead without benefit',
          code: `// Don't do this
@ResolveField('name')
async name(@Parent() user: any) {
  return user.name; // Already on parent
}`
        }
      ]
    },
    {
      category: 'Error Handling',
      do: [
        {
          title: 'Use meaningful error messages',
          description: 'Throw errors with clear, actionable messages',
          code: `@Query()
async user(@Args('id') id: string) {
  const user = await this.userService.findById(id);
  if (!user) {
    throw new Error(\`User with ID \${id} not found\`);
  }
  return user;
}`
        },
        {
          title: 'Validate input before processing',
          description: 'Validate data and provide clear validation errors',
          code: `@Mutation()
async createUser(@Args('input') input: any) {
  if (!isValidEmail(input.email)) {
    throw new Error('Invalid email format');
  }
  return this.userService.create(input);
}`
        }
      ],
      dont: [
        {
          title: 'Don\'t throw generic errors',
          description: 'Generic errors don\'t help users understand what went wrong',
          code: `@Query()
async user(@Args('id') id: string) {
  const user = await this.userService.findById(id);
  if (!user) throw new Error('Error');
  return user;
}`
        },
        {
          title: 'Don\'t skip input validation',
          description: 'This can lead to unexpected errors and security issues',
          code: `@Mutation()
async createUser(@Args('input') input: any) {
  // No validation - risky!
  return this.userService.create(input);
}`
        }
      ]
    },
    {
      category: 'Security',
      do: [
        {
          title: 'Always authenticate sensitive operations',
          description: 'Use guards to protect queries and mutations that require authentication',
          code: `@Query()
@UseGuards(AuthGuard)
async me(@Ctx('user') user: any) {
  return user;
}

@Mutation()
@UseGuards(AuthGuard)
async deleteUser(@Args('id') id: string) {
  return this.userService.delete(id);
}`
        },
        {
          title: 'Implement query complexity limits',
          description: 'Limit query depth and complexity to prevent DoS attacks',
          code: `GraphQLModule.forRoot({
  validationRules: [
    depthLimit(5),
    createComplexityLimitRule(1000)
  ]
})`
        }
      ],
      dont: [
        {
          title: 'Don\'t expose sensitive operations without auth',
          description: 'This creates serious security vulnerabilities',
          code: `@Mutation()
async deleteUser(@Args('id') id: string) {
  // No auth - anyone can delete!
  return this.userService.delete(id);
}`
        },
        {
          title: 'Don\'t allow unlimited query complexity',
          description: 'This makes your API vulnerable to DoS attacks',
          code: `GraphQLModule.forRoot({
  // No limits - vulnerable!
  typeDefs: './schema.graphql'
})`
        }
      ]
    }
  ],
  
  troubleshooting: [
    {
      issue: 'Resolver not executing / "Cannot query field" error',
      symptoms: [
        'GraphQL returns error: "Cannot query field X on type Y"',
        'Resolver methods not being called',
        'Field resolvers not working'
      ],
      solution: 'Ensure resolver is registered in GraphQL module and schema matches resolver decorators',
      code: `// Ensure resolver is registered
@Module({
  imports: [
    GraphQLModule.forRoot({
      typeDefs: './schema.graphql',
      resolvers: [UserResolver]  // Add your resolver here
    })
  ]
})

// Verify method name matches schema
// schema.graphql: users: [User!]!
@Resolver()
export class UserResolver {
  @Query()
  async users() {  // Name must match schema
    return this.userService.findAll();
  }
}`
    },
    {
      issue: 'N+1 Query Problem / Slow Performance',
      symptoms: [
        'Many database queries for a single GraphQL query',
        'Slow response times for nested queries',
        'Database connection pool exhaustion'
      ],
      solution: 'Implement DataLoader in context and use it in field resolvers',
      code: `// Create dataloaders in context
GraphQLModule.forRoot({
  context: ({ req }) => ({
    dataloaders: {
      userLoader: new DataLoader(ids => batchGetUsers(ids))
    }
  })
})

// Use DataLoader in field resolvers
@ResolveField('author')
async author(@Parent() post: any, @Ctx() ctx: any) {
  return ctx.dataloaders.userLoader.load(post.authorId);
}`
    },
    {
      issue: 'Subscription not receiving updates',
      symptoms: [
        'Subscription established but no events received',
        'WebSocket connection drops',
        'Events published but subscribers not notified'
      ],
      solution: 'Ensure trigger names match between publish and subscribe, and check filter logic',
      code: `// Publishing (trigger name must match)
await this.pubSub.publish('MESSAGE_ADDED', {
  messageAdded: message  // Field name must match subscription
});

// Subscribing
@Subscription()
messageAdded() {
  return this.pubSub.asyncIterator('MESSAGE_ADDED');  // Same name
}

// Check filter logic
@Subscription('messageAdded', {
  filter: (payload, variables) => {
    console.log('Filter:', payload, variables);  // Debug
    return payload.messageAdded.roomId === variables.roomId;
  }
})
messageAdded(@Args('roomId') roomId: string) {
  return this.pubSub.asyncIterator('MESSAGE_ADDED');
}`
    },
    {
      issue: 'Context or dependencies not available',
      symptoms: [
        'undefined when accessing context properties',
        'Dependency injection not working',
        'Cannot read property of undefined'
      ],
      solution: 'Set up context in GraphQL module and ensure services are provided',
      code: `// Set up context
GraphQLModule.forRoot({
  context: ({ req, connection }) => {
    if (req) {
      return { user: req.user, req };
    }
    if (connection) {
      return connection.context;
    }
  }
})

// Ensure services are provided
@Module({
  imports: [GraphQLModule.forRoot({ ... })],
  providers: [UserService, PostService, PubSub]
})
export class AppModule {}`
    },
    {
      issue: 'GraphQL Playground not loading',
      symptoms: [
        '404 error when accessing /graphql',
        'Playground page is blank',
        'Cannot access GraphQL endpoint'
      ],
      solution: 'Enable playground explicitly in configuration',
      code: `GraphQLModule.forRoot({
  typeDefs: './schema.graphql',
  resolvers: [UserResolver],
  playground: true,       // Enable playground
  introspection: true     // Enable introspection
})

// Access at: http://localhost:3000/graphql`
    }
  ],
  
  relatedPackages: ['@nl-framework/core', '@nl-framework/http', '@nl-framework/auth'],
  
  changelog: [
    {
      version: '1.0.0',
      changes: [
        'Initial release with Apollo Server integration',
        'Support for @Resolver, @Query, @Mutation, @Subscription decorators',
        'DataLoader integration for N+1 prevention',
        'WebSocket subscriptions with PubSub',
        'Guards and interceptors for authentication'
      ]
    }
  ]
};
