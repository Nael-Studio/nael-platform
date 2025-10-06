import type { PromptTemplate } from './types';

function buildRoutesInput(raw?: string): string {
  if (!raw) return '';
  return raw
    .split(',')
    .map((route) => route.trim())
    .filter(Boolean)
    .map((route) => {
      const [method = 'GET', path = '/'] = route.split(/\s+/);
      return `  @${method.toUpperCase().replace(/[^A-Z]/g, '')}(\'${path}\')\n  handler${method}${path.replace(/[^a-zA-Z]/g, '')}() {\n    // TODO: implement\n  }`;
    })
    .join('\n\n');
}

export const createControllerPrompt: PromptTemplate = {
  name: 'create-http-controller',
  description: 'Generate a new HTTP controller with routes following Nael Framework best practices.',
  arguments: [
    { name: 'controllerName', description: 'Controller class name (e.g., UsersController)', required: true },
    { name: 'basePath', description: 'Base path for the controller (e.g., /users)', required: true },
    { name: 'routes', description: 'Comma-separated routes (e.g., "GET /, POST /, GET /:id")', required: false },
  ],
  build(args) {
    const controllerName = args.controllerName ?? 'ExampleController';
    const basePath = args.basePath ?? '/example';
    const routesBlock = buildRoutesInput(args.routes);
    const fallbackRoutes = `  @Get('/')
  list() {
    return this.service.list?.() ?? [];
  }`;

    return `import { Controller${routesBlock ? ', Get, Post, Put, Delete' : ', Get'} } from '@nl-framework/http';
import { Injectable, Module } from '@nl-framework/core';

@Injectable()
class ${controllerName.replace(/Controller$/, '')}Service {
  // TODO: add service methods
}

@Controller('${basePath}')
export class ${controllerName} {
  constructor(private readonly service: ${controllerName.replace(/Controller$/, '')}Service) {}

${routesBlock || fallbackRoutes}
}

@Module({
  controllers: [${controllerName}],
  providers: [${controllerName.replace(/Controller$/, '')}Service],
})
export class ${controllerName.replace(/Controller$/, '')}Module {}
`;
  },
};
