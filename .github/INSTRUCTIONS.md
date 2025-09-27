# nl-framework GitHub Instructions

These guidelines keep our work consistent across issues, pull requests, and automation. Follow them before opening contributions or triggering new tasks.

## Project vision
- Build a NestJS-inspired framework optimized for Bun.
- Provide first-class support for microservices via Dapr with Redis defaults, Apollo Federation, Better Auth, and a MongoDB-based ORM.
- Ship each package as an npm-ready workspace within a single monorepo.

## Repository layout
```
packages/
  core/              # Dependency injection, modules, lifecycle
  config/            # YAML loader, env overrides, validation
  http/              # Bun server adapter, routing, middleware
  graphql/           # Apollo Federation subgraph utilities
  microservices/     # Dapr integrations, pub/sub abstractions
  gateway/           # Apollo Gateway bootstrapper
  auth/              # Better Auth integration helpers
  orm/               # MongoDB ODM with audit + soft delete
  cli/               # (Optional) codegen, scaffolding utilities
examples/
  services/*         # Sample REST + GraphQL microservices
  gateway/           # Gateway example wiring federated subgraphs
  workers/*          # Background processors using Redis streams
config/              # YAML environment configs
scripts/             # Build/test/publish helpers
```

## Contribution workflow
1. **Plan first**
   - Capture requirements in the shared TODO tracker (GitHub issues, project board, or automation).
   - Each task should include acceptance criteria and cross-reference the relevant packages.
2. **Scaffold consistently**
   - Use Bun workspaces for every new package and keep TypeScript configs aligned with `tsconfig.base.json`.
   - Expose ESM builds with declaration files and mark publishable packages with `"publishConfig"`.
3. **Configuration & secrets**
   - Store defaults in YAML under `config/` with environment overrides like `development.yaml`, `production.yaml`.
   - Keep secrets in `.env` files (never commit) and surface required keys in documentation.
4. **Microservices & messaging**
   - Default pub/sub is Redis via Dapr components; additional brokers must be pluggable through Dapr configuration files placed in `dapr/components/`.
   - Document any new bindings or subscriptions in the service README.
5. **GraphQL federation**
   - Each service publishes a federated subgraph using the `@nl-framework/graphql` package.
   - Update the gateway service configuration when adding or removing subgraphs.
6. **Auth integration**
   - Use the Better Auth wrapper module for authentication/authorization.
   - Place reusable guards, decorators, and policies in the `auth` package.
7. **MongoDB ORM**
   - Entities must extend the base auditable model to inherit `createdAt`, `updatedAt`, and soft delete (`deletedAt`).
   - Provide migration or seed scripts when introducing new collections.
8. **Testing & quality gates**
   - Implement unit tests with `bun test` / `vitest` and ensure integration tests cover microservice flows.
   - Run formatters and linters (`biome` or `eslint` TBD) before submitting changes.
   - Record test/build commands in PR descriptions.
9. **Documentation**
   - Update the root README and package-level docs after any notable change.
   - Maintain changelogs if publishing to npm.

## Pull request template
Include the following in every PR:
- Summary of changes
- Checklist of affected packages
- Tests executed (`bun test`, `bun run lint`, etc.)
- Deployment or Dapr component updates

## Release & publishing checklist
- Bump versions consistently across affected packages (use `scripts/publish.ts`).
- Ensure `package.json` contains proper metadata (`name`, `version`, `exports`, `types`).
- Run `bun build` and `bun test` for all workspaces before `npm publish`.
- Tag releases with `v<major>.<minor>.<patch>` and attach release notes summarizing new capabilities.

## Automation opportunities
- GitHub Actions for lint/test/build matrix on Bun.
- Dapr component validation workflow.
- Release orchestration using changesets or custom scripts.

Keep this file up to date whenever the architecture or tooling evolves.