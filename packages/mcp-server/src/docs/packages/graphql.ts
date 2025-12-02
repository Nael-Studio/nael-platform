import type { PackageDocumentation } from '../../types';

export const graphqlDocumentation: PackageDocumentation = {
  name: '@nl-framework/graphql',
  version: '0.2.7',
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
    {
      title: 'Enum Registration',
      description: 'Call `registerEnumType` to surface TypeScript enums in your schema without hand-written SDL.',
      icon: '🧾',
    },
    {
      title: 'Custom Scalars Registry',
      description: 'Register reusable scalars (including the bundled JSON scalar) with `registerScalarType` and reference them in decorators immediately.',
      icon: '🪄',
    },
  ],
  quickStart: {
    description: 'Create a resolver with queries and bootstrap Apollo Server via the platform package.',
    steps: [
      'Define object types and DTOs with decorators or TypeScript interfaces.',
      'Create a resolver class and annotate operations with `@Query` and `@Mutation`.',
      'Decorate input DTO classes with `@InputType()` (and fields with `@Field()`) so schema metadata is generated.',
      'Register enums and scalars with `registerEnumType` / `registerScalarType` so schema builder can emit them.',
      'Register each resolver under the module\'s `resolvers` array so discovery picks them up.',
      'Let NL FrameworkFactory auto-mount GraphQL—no enable flag is required once resolvers are registered.',
      'Create an application with `NL FrameworkFactory.create()` and start listening on your desired port.',
    ],
    code: `import { Module } from '@nl-framework/core';
import {
  Resolver,
  Query,
  Mutation,
  Args,
  InputType,
  Field,
  registerEnumType,
  registerScalarType,
  GraphQLJSON,
} from '@nl-framework/graphql';
import { NL FrameworkFactory } from '@nl-framework/platform';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

enum Role {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

registerEnumType(Role, { name: 'Role', description: 'User permission level.' });
registerScalarType(GraphQLJSON, { overwrite: true, description: 'Arbitrary JSON payload.' });

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

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown>;
}

@Resolver('User')
class UsersResolver {
  private readonly users = new Map<string, { id: string; email: string; name?: string; metadata: Record<string, unknown> }>();

  @Query(() => [String])
  users() {
    return Array.from(this.users.values()).map((user) => user.email);
  }

  @Mutation(() => GraphQLJSON)
  createUser(@Args('input', () => CreateUserInput) input: CreateUserInput) {
    const id = crypto.randomUUID();
    const user = {
      id,
      email: input.email,
      name: input.name,
      metadata: input.metadata ?? {},
    };
    this.users.set(id, user);
    return user;
  }
}

@Module({
  providers: [UsersResolver],
  resolvers: [UsersResolver],
})
class GraphqlModule {}

const app = await NL FrameworkFactory.create(GraphqlModule);
const { graphql } = await app.listen({ http: 4000 });
console.log('GraphQL ready at', graphql?.url ?? 'http://localhost:4000/graphql');
`,
  },
  api: {
    decorators: [
      {
        name: '@ObjectType',
        signature: '@ObjectType(options?: ObjectTypeOptions): ClassDecorator',
        description: 'Register a GraphQL object type tied to the decorated class.',
        parameters: [
          {
            name: 'isAbstract',
            type: 'boolean',
            description: 'Skip SDL emission for base classes while still inheriting their decorated fields.',
            required: false,
          },
        ],
      },
      {
        name: '@InputType',
        signature: '@InputType(options?: ObjectTypeOptions): ClassDecorator',
        description: 'Declare an input type for arguments or mutations.',
        parameters: [
          {
            name: 'isAbstract',
            type: 'boolean',
            description: 'Mark the input as abstract so subclasses reuse its fields without duplicating schema definitions.',
            required: false,
          },
        ],
      },
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
    functions: [
      {
        name: 'registerEnumType',
        signature: 'registerEnumType(enumRef: Record<string, unknown>, options: RegisterEnumTypeOptions): void',
        description: 'Registers a TypeScript enum so the schema builder emits the corresponding GraphQL enum definition.',
        examples: [
          "registerEnumType(Status, { name: 'Status', description: 'Available user statuses.' });",
        ],
      },
      {
        name: 'registerScalarType',
        signature: 'registerScalarType(scalar: GraphQLScalarType, options?: RegisterScalarTypeOptions): void',
        description: 'Adds or overwrites a GraphQL scalar so it can be referenced in decorators and schema metadata.',
        examples: [
          "registerScalarType(GraphQLJSON, { overwrite: true, description: 'Flexible JSON payload.' });",
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
    {
      title: 'Register a TypeScript Enum',
      description: 'Expose a user role enum to GraphQL without manual SDL.',
      code: `import { registerEnumType } from '@nl-framework/graphql';

export enum Role {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

registerEnumType(Role, {
  name: 'Role',
  description: 'Available application roles.',
  valuesMap: {
    ADMIN: { description: 'Full administrative access.' },
    MEMBER: { description: 'Standard user permissions.' },
  },
});
`,
      explanation: 'Call this once during bootstrap so any resolver returning `Role` automatically gains the enum definition.',
      tags: ['graphql', 'enum'],
    },
    {
      title: 'Reuse the JSON Scalar',
      description: 'Return arbitrary structured data from a resolver using the bundled JSON scalar.',
      code: `import { Resolver, Query, GraphQLJSON } from '@nl-framework/graphql';

@Resolver('Diagnostics')
export class DiagnosticsResolver {
  @Query(() => GraphQLJSON)
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      details: { uptime: process.uptime() },
    };
  }
}
`,
      explanation: 'No additional packages required—the JSON scalar is registered for you in schema builder.',
      tags: ['graphql', 'scalar'],
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
        {
          title: 'Centralize enum and scalar registration',
          description: 'Invoke `registerEnumType` / `registerScalarType` in a single module so every resolver reuses the same definitions.',
        },
        {
          title: 'Use abstract base types wisely',
          description: 'Set `isAbstract: true` on shared object or input bases so only concrete subclasses emit SDL.',
        },
      ],
      dont: [
        {
          title: 'Avoid leaking internal errors',
          description: 'Wrap thrown errors and surface user-friendly messages while logging details with the logger package.',
        },
        {
          title: 'Skip scalar registration',
          description: 'Referencing an unregistered custom scalar will break schema generation—always register before use.',
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
    {
      issue: 'Unknown type "Role" or "JSON" during schema build',
      symptoms: ['GraphQLSchemaBuilderError: Cannot resolve type "Role"', 'Unknown type "JSON" in resolver decorator'],
      solution:
        'Ensure `registerEnumType` has been called for each enum and `registerScalarType` (or an overwrite) has been registered before module bootstrap.',
      relatedTopics: ['registerEnumType', 'registerScalarType'],
    },
  ],
  relatedPackages: ['@nl-framework/platform', '@nl-framework/auth', '@nl-framework/logger'],
};
