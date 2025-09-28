# Mongo ORM Example

This example shows how to combine the NL Framework HTTP stack with the driver-based ORM package. It wires up a simple `User` collection using the bundled MongoDB driver, exposes REST endpoints, and demonstrates tracked, automatic seed execution.

## What you get

- `OrmModule.forRoot` + `createMongoDriver` configuration with automatic, history-aware seed execution
- `OrmRepository` usage from services and seeds
- REST handlers built with `@nl-framework/http`
- Config-driven HTTP server bootstrap via `NaelFactory`

## Prerequisites

- Bun 1.1+
- A running MongoDB instance (local or remote). By default the example connects to `mongodb://127.0.0.1:27017/nl-framework-orm-example`.

You can override the connection by exporting `MONGODB_URI` and `MONGODB_DB` before running the scripts.

```bash
export MONGODB_URI="mongodb://127.0.0.1:27017/my-db"
export MONGODB_DB="my-db"
```

## Project layout

```
examples/mongo-orm
├── config/
│   └── default.yaml          # HTTP host/port defaults
├── src/
│   ├── app.module.ts         # Module wiring Mongo ORM + HTTP controller
│   ├── main.ts               # Server bootstrap
│   └── users/
│       ├── user.document.ts  # @Document metadata for the User collection
│       ├── users.controller.ts# REST controller exposing CRUD-ish routes
│       ├── users.service.ts  # Service wrapping the generic ORM repository helpers
│       └── seeds/
│           └── initial-users.seed.ts
└── package.json
```

## Run it

1. Build the workspace packages (from the repo root):

   ```bash
   bun run build
   ```

2. Start the example HTTP API (seeds run automatically on the configured environment the first time):

   ```bash
   bun run --filter @nl-framework/example-mongo-orm start
   ```

   The server logs its URL (default `http://localhost:4010`). Seeds execute automatically the first time—tracked per environment and connection—so reruns stay idempotent without manual scripts.

3. Hit the endpoints:

   ```bash
   curl http://localhost:4010/users
   curl -X POST http://localhost:4010/users \
     -H "Content-Type: application/json" \
     -d '{"email":"new@example.com","name":"New User"}'
   curl -X DELETE http://localhost:4010/users/<id>
   curl -X POST http://localhost:4010/users/<id>/restore
   ```

## Configuration

HTTP host and port live in `config/default.yaml`. Override them by creating `config/local.yaml` or exporting environment variables recognized by the framework's config service.

The MongoDB connection uses environment variables exclusively so the example can run outside the config system. Customize with `MONGODB_URI` / `MONGODB_DB` or edit `app.module.ts` directly if needed.

## Next steps

- Add additional entities and register them with `OrmModule.forFeature`
- Layer validation or request DTOs on the controller methods
- Experiment with soft deletes by querying with the `?withDeleted=true` flag
- Create more `@Seed`-decorated classes for fixtures per environment or connection
