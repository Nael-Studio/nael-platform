# @nl-framework/cli

A Bun-native command-line interface for scaffolding Nael Framework services, feature modules, controllers, services, resolvers, models, and shareable libraries.

## Usage

After building or installing the package, you can run the following commands:

### Create a service

```bash
nl new my-service
```

Generates a new project in `./my-service` with Bun scripts, TypeScript configuration, and a starter HTTP controller. By default the CLI avoids overwriting existing files; use `--force` to permit regenerating files and `--install` to automatically run `bun install`.

### Generate a feature module

```bash
nl g module users
```

Creates `src/modules/users` in the current workspace, including a `UsersModule` class, placeholder folders for controllers/services/resolvers/models, and an export entry in `src/modules/index.ts`. Use `--force` to regenerate an existing module directory.

### Generate a service

```bash
nl g service users --module users
```

Generates `src/modules/users/services/users.service.ts`, wires the service into the module's providers array, and re-exports it via `src/modules/users/index.ts`. Use `--module` (or `-m`) to target the destination module.

### Generate a controller

```bash
nl g controller users --module users
```

Creates `src/modules/users/controllers/users.controller.ts`, registers the controller with the module, and exports it. Adjust the generated routes and inject services as needed.

### Generate a resolver

```bash
nl g resolver users --module users
```

Produces `src/modules/users/resolvers/users.resolver.ts`, adds the resolver to the module providers, and re-exports it from `src/modules/users/index.ts`. Extend the resolver with fields, queries, or mutations and inject services as required.

### Generate a model

```bash
nl g model user --module users
```

Creates `src/modules/users/models/user.model.ts` with a default `id` field decorated for GraphQL, adds an index export in `src/modules/users/models/index.ts`, and leaves the module primed for further field additions.

### Generate a shared library

```bash
nl g lib shared-utils
```

Creates `./libs/shared-utils` with a TypeScript-ready build, README, and an initial feature module (exported via `src/modules/index.ts`). Pass `--force` to overwrite existing files if the directory is not empty.

## Development

```bash
bun install
bun run --cwd packages/cli dev -- --help
bun run --cwd packages/cli build
```

The build command compiles TypeScript output to `dist/` so the `nl` binary can be executed directly.
