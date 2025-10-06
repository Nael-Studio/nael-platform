import type { PromptTemplate } from './types';

function parseOperations(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const createResolverPrompt: PromptTemplate = {
  name: 'create-graphql-resolver',
  description: 'Generate a new GraphQL resolver with queries and mutations.',
  arguments: [
    { name: 'resolverName', description: 'Resolver class name (e.g., UsersResolver)', required: true },
    { name: 'typeName', description: 'GraphQL type name (e.g., User)', required: true },
    {
      name: 'operations',
      description: 'Comma-separated operations (e.g., "users, user(id), createUser").',
      required: false,
    },
  ],
  build(args) {
    const resolverName = args.resolverName ?? 'ExampleResolver';
    const typeName = args.typeName ?? 'Example';
    const operations = parseOperations(args.operations);

    const fields = operations.length
      ? operations
          .map((operation) => {
            const [namePart] = operation.split('(');
            const safeName = (namePart ?? operation).trim();
            const decorator = /^create|update|delete|mutate/i.test(safeName)
              ? 'Mutation'
              : 'Query';
            return `  @${decorator}(() => ${typeName})
  ${safeName}() {
    // TODO: implement resolver logic
    return null;
  }`;
          })
          .join('\n\n')
      : `  @Query(() => ${typeName})
  ${typeName.toLowerCase()}() {
    return null;
  }`;

    const extraImports = operations.some((operation) => /^create|update|delete|mutate/i.test(operation.trim()))
      ? ', Mutation'
      : '';

    return `import { Resolver, Query${extraImports} } from '@nl-framework/graphql';
import { Injectable } from '@nl-framework/core';

@Injectable()
@Resolver('${typeName}')
export class ${resolverName} {
${fields}
}
`;
  },
};
