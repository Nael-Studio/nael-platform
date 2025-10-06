import type { ApiDecoratorEntry } from '../../types';

export const decoratorReference: ApiDecoratorEntry[] = [
  {
    name: '@Module',
    signature: '@Module(metadata: ModuleMetadata): ClassDecorator',
    description: 'Define an application module with providers, controllers, and imports.',
    parameters: [
      {
        name: 'providers',
        type: 'Provider[]',
        description: 'Services available within the module scope.',
      },
      {
        name: 'controllers',
        type: 'ClassType[]',
        description: 'HTTP controllers exposed by the module.',
      },
    ],
  },
  {
    name: '@Controller',
    signature: '@Controller(prefix?: string): ClassDecorator',
    description: 'Expose a class as an HTTP controller.',
  },
  {
    name: '@Resolver',
    signature: '@Resolver(type?: string | (() => unknown)): ClassDecorator',
    description: 'Mark a class as a GraphQL resolver.',
  },
  {
    name: '@MessagePattern',
    signature: '@MessagePattern(topic: string): MethodDecorator',
    description: 'Subscribe a method to a Dapr pub/sub topic.',
  },
];
