# @nl-framework/cli

A Bun-native command-line interface for scaffolding new Nael Framework services.

## Usage

After building or installing the package, run:

```bash
nl new my-service
```

This generates a new project in `./my-service` with Bun scripts, TypeScript configuration, and a starter HTTP controller. By default the CLI avoids overwriting existing files; use `--force` to permit regenerating files and `--install` to automatically run `bun install`.

## Development

```bash
bun install
bun run --cwd packages/cli dev -- --help
bun run --cwd packages/cli build
```

The build command compiles TypeScript output to `dist/` so the `nl` binary can be executed directly.
