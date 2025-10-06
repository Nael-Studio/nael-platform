import type { PromptTemplate } from './types';

function buildMessagePatterns(raw?: string): string {
  if (!raw) {
    return `  @MessagePattern('example.event')
  async handleExample(payload: Record<string, unknown>) {
    // TODO: implement handler
    console.log(payload);
  }`;
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((pattern) => `  @MessagePattern('${pattern}')
  async handle${pattern.replace(/[^a-zA-Z]/g, '')}(payload: Record<string, unknown>) {
    // TODO: implement handler
  }`)
    .join('\n\n');
}

export const setupMicroservicePrompt: PromptTemplate = {
  name: 'setup-microservice',
  description: 'Generate a microservice module with message patterns and Dapr integration.',
  arguments: [
    { name: 'serviceName', description: 'Service name (e.g., OrdersService)', required: true },
    { name: 'patterns', description: 'Comma-separated message patterns (e.g., order.create, order.update)', required: false },
  ],
  build(args) {
    const serviceName = args.serviceName ?? 'ExampleService';
    const className = serviceName.replace(/Service$/, '') + 'Service';
    const handlerBlock = buildMessagePatterns(args.patterns);

    return `import { Injectable, Module } from '@nl-framework/core';
import { MessagePattern } from '@nl-framework/microservices';

@Injectable()
class ${className} {
${handlerBlock}
}

@Module({
  providers: [${className}],
  exports: [${className}],
})
export class ${serviceName.replace(/Service$/, '')}MicroserviceModule {}
`;
  },
};
