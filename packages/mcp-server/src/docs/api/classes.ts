import type { ApiClassEntry } from '../../types';

export const classReference: ApiClassEntry[] = [
  {
    name: 'Application',
    description: 'Bootstrapper that manages the DI container and lifecycle hooks.',
    methods: [
      {
        name: 'create',
        signature: 'static create(rootModule: ClassType, options?: ApplicationOptions): Promise<Application>',
        description: 'Instantiate the application given a root module.',
      },
      {
        name: 'init',
        signature: 'init(): Promise<void>',
        description: 'Trigger lifecycle hooks and mark the app as ready.',
      },
    ],
  },
  {
    name: 'Logger',
    description: 'Structured logger instance.',
    methods: [
      {
        name: 'info',
        signature: 'info(message: string, metadata?: Record<string, unknown>): void',
        description: 'Log an informational message.',
      },
    ],
  },
  {
    name: 'ConfigService',
    description: 'Typed configuration accessor.',
    methods: [
      {
        name: 'get',
        signature: 'get<T>(path: string, defaultValue?: T): T',
        description: 'Retrieve configuration values using dot notation.',
      },
    ],
  },
];
