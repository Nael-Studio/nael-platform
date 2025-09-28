# @nl-framework/config

Configuration utilities for the NL Framework. This package wraps the core `ConfigLoader` and `ConfigService` with a module-first API so you can expose configuration values through dependency injection.

## Installation

```bash
bun add @nl-framework/config
```

## Quick start

Register the module at the root of your application. By default it loads YAML files from the `config` directory (`default.yaml`, `<env>.yaml`, then `env.yaml`):

```ts
import { Module } from '@nl-framework/core';
import { ConfigModule, ConfigService } from '@nl-framework/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      dir: 'config',
      path: 'env.yaml',
      overrides: {
        app: { port: 4000 },
      },
    }),
  ],
})
export class AppModule {
  constructor(private readonly config: ConfigService) {}
}
```

Resolve values anywhere in your DI graph:

```ts
@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  getPort(): number {
    return this.config.get<number>('app.port', 3000);
  }
}
```

### Async options

Use `forRootAsync` when configuration comes from other providers:

```ts
@Module({
  imports: [
    ConfigModule.forRootAsync({
      useFactory: async () => ({
        dir: 'config',
        overrides: {
          feature: {
            cache: process.env.ENABLE_CACHE === 'true',
          },
        },
      }),
    }),
  ],
})
export class AppModule {}
```

You can also provide a class that implements `ConfigModuleOptionsFactory`.

### Feature slices

Expose nested configuration once and inject it elsewhere using `forFeature`:

```ts
import { Inject } from '@nl-framework/core';
import { ConfigModule, getConfigFeatureToken } from '@nl-framework/config';

const databaseConfigToken = getConfigFeatureToken('database');

@Module({
  imports: [
    ConfigModule.forRoot(),
    ConfigModule.forFeature('database'),
  ],
})
export class DatabaseModule {
  constructor(@Inject(databaseConfigToken) private readonly config: Record<string, unknown>) {}
}
```

The token is stable (`Symbol.for('nl:config:feature:<path>')`) so you can reuse it without storing a reference.

## API

- `ConfigModule.forRoot(options?: ConfigModuleOptions)` — Load YAML configuration using explicit options.
- `ConfigModule.forRootAsync(options: ConfigModuleAsyncOptions)` — Resolve options via DI (`useFactory`, `useClass`, or `useExisting`).
- `ConfigModule.forFeature(pathOrOptions)` — Provide a specific config slice (with optional transform) as an injectable token.
- `ConfigService` — Re-exported from `@nl-framework/core` for convenience.
- `ConfigLoader` — Re-exported loader utility for manual use.

## Testing

This package ships with Bun tests. Run them with:

```bash
bun run packages/config/package.json test
```
