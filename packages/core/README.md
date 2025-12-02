# @nl-framework/core

Foundational runtime for the NL Framework Framework, providing dependency injection, module lifecycle management, configuration hooks, and bootstrap primitives.

## Installation

```bash
bun add @nl-framework/core reflect-metadata
```

Enable the Reflect metadata polyfill once near the process entry point:

```ts
import 'reflect-metadata';
```

## Highlights

- **Modular architecture** – compose applications from focused modules with predictable dependency graphs.
- **Lifecycle hooks** – implement `OnModuleInit` / `OnModuleDestroy` to manage external resources safely.
- **Configuration ready** – pair with `@nl-framework/config` for strongly typed configuration injection.

## Quick start

```ts
import 'reflect-metadata';
import { Application, Module, Injectable } from '@nl-framework/core';

@Injectable()
class HelloService {
  getGreeting(name: string) {
    return `Hello, ${name}!`;
  }
}

@Module({
  providers: [HelloService],
})
class AppModule {}

const app = await Application.create(AppModule);
await app.init();

const service = app.getApplicationContext().get(HelloService);
console.log(service.getGreeting('NL Framework Developer'));

await app.close();
```

## License

Apache-2.0
