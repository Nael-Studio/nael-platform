# 02 — `@nl-framework/testing`

**Goal:** a first-party testing package mirroring `@nestjs/testing` ergonomics so
users (and this repo) can unit/integration-test modules without booting real servers.

## Context — read first
- `packages/core/src/application.ts` / `ApplicationContext` creation path
- `packages/core/src/container/container.ts` — provider registration/resolution
- `packages/http/src/http-application.ts` and `packages/http/src/router/router.ts`
  — especially how a `Request` is dispatched to a handler (the `fetch` handler)
- `packages/graphql/src/graphql-application.ts` — how Apollo Server is constructed
- `packages/microservices/src/dispatcher/message-dispatcher.ts`
- `packages/platform/src/` (`NaelFactory`) — composition patterns to mirror
- Existing tests across packages for current ad-hoc setup patterns to replace

## Package skeleton

New workspace package `packages/testing` (`@nl-framework/testing`), version-locked
like siblings, deps: `@nl-framework/core` (peer/dep pattern: copy from
`packages/config/package.json`). Optional peers: http, graphql, microservices, orm.

## API design

```ts
import { Test } from '@nl-framework/testing';

const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
  providers: [...],           // extra providers
})
  .overrideProvider(UserService).useValue(mockUserService)
  .overrideProvider(CONFIG_TOKEN).useFactory({ factory: () => testConfig })
  .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
  .overrideInterceptor(CacheInterceptor).useValue(passthroughInterceptor)
  .overrideFilter(HttpExceptionFilter).useClass(TestFilter)
  .compile();                  // -> TestingModule extends ApplicationContext

const service = moduleRef.get(UserService);
await moduleRef.close();       // runs shutdown lifecycle
```

HTTP integration testing (no port binding — call the fetch handler directly):

```ts
const app = moduleRef.createHttpApplication();   // wraps HttpApplication
const res = await app.request('/users/42', { method: 'GET', headers: {...} });
// res is a standard Response; add helper: await app.requestJson('/users', {...})
```

GraphQL: `const gql = moduleRef.createGraphqlApplication(); await
gql.execute({ query, variables, contextValue })` — use Apollo Server's
`executeOperation` under the hood.

Microservices: `moduleRef.createMicroserviceHarness()` returning
`{ emit(pattern, payload), send(pattern, payload) }` that drives
`MessageDispatcher` in-memory (no Dapr).

## Tasks

1. **`TestingModuleBuilder`** — collects the module definition + overrides, then
   builds an `ApplicationContext` whose container substitutes overridden providers.
   Overrides must apply *before* instantiation (hook the container's provider
   registration; do not instantiate-then-replace). Guard/interceptor/filter
   overrides work by token replacement in the same registries the runtime uses
   (see `packages/http/src/guards/registry` pattern and the metadata files).
2. **HTTP test client** — construct `HttpApplication` without `Bun.serve`; expose
   the internal fetch/dispatch function. If it's currently inseparable from
   `Bun.serve`, refactor `HttpApplication` to expose `handle(request: Request):
   Promise<Response>` (this is also useful for serverless deployment later).
3. **GraphQL executor** — construct the Apollo instance and call
   `executeOperation`; map the framework's context-building path so guards run.
4. **Microservice harness** — in-memory transport implementing the transport
   interface (`packages/microservices/src/interfaces/transport.ts`).
5. **Docs** — package README with one example per transport; docs-site page
   `docs-site/src/app/docs/testing/page.mdx`.

## Acceptance criteria
- All four surfaces work in this repo's own tests (add at least one usage each in
  `packages/testing/tests/`).
- `overrideProvider().useValue()` on a provider that has downstream injectors
  works (the mock is what dependents receive).
- `moduleRef.close()` triggers the same lifecycle hooks as production shutdown.
- No port is ever bound during tests; suite runs with no Mongo/Dapr/network.
- Zero new runtime deps.
