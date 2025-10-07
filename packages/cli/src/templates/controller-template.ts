import type { TemplateFile } from './project-template';

export interface ControllerTemplateContext {
  controllerClassName: string;
  controllerFileName: string;
  routePath: string;
}

const createControllerFile = (ctx: ControllerTemplateContext): string => `import { Controller, Get } from '@nl-framework/http';

@Controller('${ctx.routePath}')
export class ${ctx.controllerClassName} {
  @Get()
  findAll() {
    return [];
  }
}
`;

export const createControllerTemplate = (ctx: ControllerTemplateContext): TemplateFile[] => [
  {
    path: `${ctx.controllerFileName}.ts`,
    contents: createControllerFile(ctx),
  },
];