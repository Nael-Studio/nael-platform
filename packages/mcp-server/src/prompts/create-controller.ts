import type { PromptTemplate } from './types';

function toKebabCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

function buildRoutesInput(raw?: string): string {
  if (!raw) return '';
  return raw
    .split(',')
    .map((route) => route.trim())
    .filter(Boolean)
    .map((route) => {
      const [methodRaw = 'GET', path = '/'] = route.split(/\s+/);
      const validMethod = /^(GET|POST|PUT|DELETE|PATCH)$/i.test(methodRaw) ? methodRaw.toUpperCase() : 'GET';
      return `  @${validMethod}('${path}')\n  handler${validMethod}${path.replace(/[^a-zA-Z]/g, '')}() {\n    // TODO: implement\n  }`;
    })
    .join('\n\n');
}

export const createControllerPrompt: PromptTemplate = {
  name: 'create-http-controller',
  description: 'Generate a new HTTP controller with routes following NL Framework Framework best practices.',
  arguments: [
    { name: 'controllerName', description: 'Controller class name (e.g., UsersController)', required: true },
    { name: 'basePath', description: 'Base path for the controller (e.g., /users)', required: true },
    { name: 'routes', description: 'Comma-separated routes (e.g., "GET /, POST /, GET /:id")', required: false },
    { name: 'moduleName', description: 'Existing module to register this controller under (e.g., users)', required: false },
  ],
  build(args) {
    const controllerName = args.controllerName ?? 'ExampleController';
    const basePath = args.basePath ?? '/example';
    const routesBlock = buildRoutesInput(args.routes);
    const fallbackRoutes = `  @Get('/')
  list() {
    return this.service.list?.() ?? [];
  }`;
    const moduleName = args.moduleName ?? 'example';
    const commandName = toKebabCase(controllerName.replace(/Controller$/, '') || 'controller');
  const cliHeader = `// CLI alternative: nl g controller ${commandName} --module ${moduleName}
`;

  return `${cliHeader}import { Controller${routesBlock ? ', Get, Post, Put, Delete' : ', Get'} } from '@nl-framework/http';
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
