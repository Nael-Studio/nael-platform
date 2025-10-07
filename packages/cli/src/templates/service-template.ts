import type { TemplateFile } from './project-template';

export interface ServiceTemplateContext {
  serviceClassName: string;
  serviceFileName: string;
}

const createServiceFile = (ctx: ServiceTemplateContext): string => `import { Injectable } from '@nl-framework/core';

@Injectable()
export class ${ctx.serviceClassName} {
  // TODO: Implement service logic.
}
`;

export const createServiceTemplate = (ctx: ServiceTemplateContext): TemplateFile[] => [
  {
    path: `${ctx.serviceFileName}.ts`,
    contents: createServiceFile(ctx),
  },
];