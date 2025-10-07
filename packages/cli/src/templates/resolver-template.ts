import type { TemplateFile } from './project-template';

export interface ResolverTemplateContext {
  resolverClassName: string;
  resolverFileName: string;
}

const createResolverFile = (ctx: ResolverTemplateContext): string => `import { Resolver, Query } from '@nl-framework/graphql';

@Resolver()
export class ${ctx.resolverClassName} {
  @Query(() => String, { name: 'example' })
  example() {
    return '${ctx.resolverClassName} response';
  }
}
`;

export const createResolverTemplate = (ctx: ResolverTemplateContext): TemplateFile[] => [
  {
    path: `${ctx.resolverFileName}.ts`,
    contents: createResolverFile(ctx),
  },
];