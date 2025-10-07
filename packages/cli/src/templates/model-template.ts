import type { TemplateFile } from './project-template';

export interface ModelTemplateContext {
  modelClassName: string;
  modelFileName: string;
}

const createModelFile = (ctx: ModelTemplateContext): string => `import { ObjectType, Field, ID } from '@nl-framework/graphql';

@ObjectType()
export class ${ctx.modelClassName} {
  @Field(() => ID)
  id!: string;
}
`;

export const createModelTemplate = (ctx: ModelTemplateContext): TemplateFile[] => [
  {
    path: `${ctx.modelFileName}.ts`,
    contents: createModelFile(ctx),
  },
];