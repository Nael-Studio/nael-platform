# @nl-framework/cli

A Bun-native command-line interface for scaffolding Nael Framework services, feature modules, and shareable libraries.

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

Creates `src/modules/users` in the current workspace, including a `UsersModule` class, placeholder folders for controllers/services/resolvers, and an export entry in `src/modules/index.ts`. Use `--force` to regenerate an existing module directory.

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
