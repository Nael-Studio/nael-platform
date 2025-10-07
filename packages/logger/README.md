# @nl-framework/logger

Structured logging system for the Nael Framework with JSON output, contextual metadata, and transport adapters optimized for Bun.

## Installation

```bash
bun add @nl-framework/logger
```

## Highlights

- **Contextual logging** – attach correlation IDs and per-request metadata automatically across providers.
- **Pluggable transports** – stream logs to stdout, files, or external systems with minimal configuration.
- **DI integration** – inject loggers into services to keep observability concerns consistent across the app.

## Quick start

```ts
import { Logger } from '@nl-framework/logger';
import { Application } from '@nl-framework/core';

const logger = new Logger({ service: 'users-api' });
const app = await Application.create(AppModule, { logger });
await app.init();

logger.info('Application booted');
```

Create child loggers for request scopes:

```ts
const requestLogger = logger.child({ requestId: crypto.randomUUID() });
requestLogger.info('Incoming request', { path: '/users' });
```

## License

Apache-2.0
