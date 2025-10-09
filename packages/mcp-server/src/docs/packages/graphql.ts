import type { PackageDocumentation } from '../../types';

export const graphqlDocumentation: PackageDocumentation = {
  name: '@nl-framework/graphql',
  version: '0.1.0',
  description:
    'Code-first GraphQL layer with schema generation, resolver decorators, federation support, and tight integration with the core dependency injection system.',
  installation: 'bun add @nl-framework/graphql graphql',
  features: [
    {
      title: 'Resolver Decorators',
      description: 'Annotate query, mutation, and subscription handlers for clear intent and type inference.',
      icon: '🧬',
    },
    {
      title: 'Schema-First and Code-First',
      description: 'Generate SDL from TypeScript metadata or stitch existing SDL using federation directives.',
      icon: '🧵',
    },
    {
      title: 'Argument Validation',
      description:
        'Resolver arguments backed by class-validator DTOs are transformed, whitelisted, and rejected as `BAD_USER_INPUT` when invalid before hitting your business logic.',
      icon: '🧪',
    },
    {
      title: 'GraphQL Modules',
      description: 'Bundle resolvers, types, and data sources within standard framework modules.',
      icon: '📦',
    },
  ],
  quickStart: {
    description: 'Create a resolver with queries and bootstrap Apollo Server via the platform package.',
    steps: [
      'Define object types and DTOs with decorators or TypeScript interfaces.',
      'Create a resolver class and annotate operations with `@Query` and `@Mutation`.',
      'Decorate input DTO classes with `@InputType()` (and fields with `@Field()`) so schema metadata is generated.',
      'Register each resolver under the module\'s `resolvers` array so discovery picks them up.',
      'Let NaelFactory auto-mount GraphQL—no enable flag is required once resolvers are registered.',
      'Create an application with `NaelFactory.create()` and start listening on your desired port.',
    ],
    code: `import { Module } from '@nl-framework/core';
import { Resolver, Query, Mutation, Args, InputType, Field } from '@nl-framework/graphql';
import { NaelFactory } from '@nl-framework/platform';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

@InputType()
class CreateUserInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}

@Resolver('User')
class UsersResolver {
  private readonly users = new Map<string, { id: string; email: string; name?: string }>();

  @Query(() => [String])
  users() {
    return Array.from(this.users.values());
  }

  @Mutation(() => String)
  createUser(@Args('input', () => CreateUserInput) input: CreateUserInput) {
    const id = crypto.randomUUID();
    this.users.set(id, { id, email: input.email, name: input.name });
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
`,
  },
  api: {
    decorators: [
      {
        name: '@Resolver',
        signature: '@Resolver(type?: string | (() => unknown)): ClassDecorator',
        description: 'Mark a class as responsible for a GraphQL object type.',
      },
      {
        name: '@Query',
        signature: '@Query(returnType?: () => unknown, options?: QueryOptions): MethodDecorator',
        description: 'Register a GraphQL query resolver.',
      },
      {
        name: '@ResolveField',
        signature: '@ResolveField(propertyName?: string, returnType?: () => unknown): MethodDecorator',
        description: 'Resolve a nested property on a parent object.',
      },
    ],
    classes: [
      {
        name: 'GraphqlModuleBuilder',
        description: 'Utility that composes resolver metadata, SDL, and data sources before handing off to the Apollo adapter.',
        methods: [
          {
            name: 'buildSchema',
            signature: 'buildSchema(): Promise<GraphQLSchema>',
            description: 'Generate an executable GraphQL schema using registered resolvers.',
          },
        ],
      },
    ],
  },
  examples: [
    {
      title: 'Federated Subgraph',
      description: 'Expose a product subgraph with keys and references.',
      code: `@Resolver('Product')
export class ProductsResolver {
  @ResolveReference()
  async resolveReference(ref: { id: string }) {
    return this.productService.findById(ref.id);
  }
}
`,
      explanation: 'Combine with `@Key` directives in SDL to integrate with the federation gateway example.',
      tags: ['federation', 'apollo'],
    },
  ],
  bestPractices: [
    {
      category: 'Schema Design',
      do: [
        {
          title: 'Keep resolvers stateless',
          description: 'Use dependency injection to wire services; avoid storing request-specific data on resolver instances.',
        },
        {
          title: 'Decorate DTOs with InputType',
          description: 'Apply `@InputType()` and `@Field()` to input classes so schema generation emits the correct argument types.',
        },
      ],
      dont: [
        {
          title: 'Avoid leaking internal errors',
          description: 'Wrap thrown errors and surface user-friendly messages while logging details with the logger package.',
        },
      ],
    },
  ],
  troubleshooting: [
    {
      issue: 'Schema generation fails',
      symptoms: ['Runtime error: Unable to resolve return type'],
      solution:
        'Ensure every decorated method declares an explicit return type thunk (e.g., `() => User`) so metadata can be emitted.',
    },
    {
      issue: 'GraphQL never starts',
      symptoms: ['Platform logs warn that no resolvers were discovered'],
      solution:
        'List resolver classes under the module `resolvers` metadata key (not only `providers`) so the platform can register them for schema generation.',
    },
    {
      issue: 'Input arguments show up as `JSON`',
      symptoms: ['Mutations accept generic objects instead of typed fields'],
      solution:
        'Wrap request DTOs with `@InputType()` and mark properties with `@Field()` so GraphQL schema metadata is emitted for each argument.',
    },
  ],
  relatedPackages: ['@nl-framework/platform', '@nl-framework/auth', '@nl-framework/logger'],
};
