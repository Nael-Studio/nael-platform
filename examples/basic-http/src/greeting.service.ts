import { Injectable, ConfigService } from '@nl-framework/core';
import type { ExampleConfig } from './types';

@Injectable()
export class GreetingService {
  constructor(private readonly config: ConfigService<ExampleConfig>) {}

  buildGreeting(name?: string) {
    const appName = this.config.get('app.name', 'nl-framework example');
    const greeting = this.config.get('app.greeting', 'Hello');
    const recipient = name ?? 'world';

    return {
      message: `${greeting}, ${recipient}!`,
      app: appName,
      timestamp: new Date().toISOString(),
    };
  }
}
