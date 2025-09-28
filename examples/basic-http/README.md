# Basic HTTP Example

This example demonstrates how to build a tiny HTTP API on top of `@nl-framework/core` and `@nl-framework/http`. It wires up dependency injection, configuration loading from YAML files, middleware, and a simple controller with dynamic routes.

## Features

- Module + provider structure powered by the framework's DI container
- YAML-based configuration resolved via `ConfigModule.forRoot` and `ConfigService`
- Route decorators (`@Controller`, `@Get`) with automatic parameter parsing
- Context-aware logging via `@nl-framework/logger` for request tracing and lifecycle events

## Project structure

```
examples/basic-http
├── config/
│   └── default.yaml          # Environment-aware application settings
├── src/
│   ├── app.module.ts         # Root module wiring controllers/providers
│   ├── greeting.controller.ts# Controller with decorated routes
│   ├── greeting.service.ts   # Injectable service using ConfigService
│   ├── main.ts               # Application bootstrap with middleware
│   └── types.ts              # Shared config typings
└── package.json
```

## Getting started

1. Build the framework packages so typings are ready:

   ```bash
   bun run build
   ```

2. Start the example application (from the repo root or by `cd`-ing into the example):

   ```bash
   bun run --filter @nl-framework/example-basic-http start
   ```

   The server listens on `http://localhost:4000` by default. Edit `config/default.yaml` to change host/port or the greeting message. All startup and shutdown events are logged through the shared logger.

## Try it out

Fetch the default greeting:

```bash
curl http://localhost:4000/hello
```

Personalize the greeting using a route parameter:

```bash
curl http://localhost:4000/hello/Ada
```

Each response is JSON with the message, the app name, and an ISO timestamp.

## Next steps

- Add additional controllers/services to explore DI scopes
- Layer on more middleware (auth, validation, etc.) via the options passed to `createHttpApplication`
- Experiment with configuration overrides by adding `config/env.yaml` or runtime overrides in `main.ts`
- Swap in alternative logger transports (file, telemetry, etc.) by extending `@nl-framework/logger` and adjusting the bootstrap
