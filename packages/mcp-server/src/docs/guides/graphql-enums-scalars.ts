import type { GuideEntry } from '../../types';

export const graphqlEnumsAndScalarsGuide: GuideEntry = {
  id: 'graphql-enums-scalars',
  title: 'Expose Enums and Custom Scalars',
  summary:
    'Walk through registering TypeScript enums and custom GraphQL scalars so they appear in the generated schema and can be reused across resolvers.',
  steps: [
    'Create or identify the TypeScript enum you want to expose and call `registerEnumType` during bootstrap.',
    'Import or construct any `GraphQLScalarType` instances you need (for example `GraphQLJSON`) and register them with `registerScalarType`.',
    'Reference the newly registered enum or scalar inside resolver decorators such as `@Query`, `@Mutation`, or `@Field`.',
    'Optionally overwrite existing scalar registrations by passing `{ overwrite: true }` when you want to customize the description or implementation.',
  ],
  codeSamples: [
    {
      heading: 'Register once, reuse everywhere',
      code: `import {
  registerEnumType,
  registerScalarType,
  GraphQLJSON,
  Resolver,
  Query,
  Field,
  ObjectType,
} from '@nl-framework/graphql';

enum AuditAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
}

registerEnumType(AuditAction, {
  name: 'AuditAction',
  description: 'Describes the type of change recorded in the audit trail.',
});

registerScalarType(GraphQLJSON, {
  overwrite: true,
  description: 'Flexible JSON payload for audit metadata.',
});

@ObjectType()
class AuditEntry {
  @Field(() => AuditAction)
  action!: AuditAction;

  @Field(() => GraphQLJSON)
  metadata!: Record<string, unknown>;
}

@Resolver(() => AuditEntry)
export class AuditResolver {
  @Query(() => [AuditEntry])
  recentEntries() {
    return [];
  }
}
`,
      description: 'Call the helpers once during application startup so any resolver can safely reference the shared enum or scalar.',
    },
  ],
  relatedPackages: ['@nl-framework/graphql'],
};
