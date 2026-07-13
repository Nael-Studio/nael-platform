# @nl-framework/testing

First-party testing utilities for the NL Framework, mirroring `@nestjs/testing`
ergonomics. Build an application context with overridable providers, then drive
HTTP, GraphQL, and microservice handlers **in-process** — no port binding, no
Mongo, no Dapr, no network.

## Installation

```bash
bun add -d @nl-framework/testing
```

`@nl-framework/core` is a required peer. `@nl-framework/http`,
`@nl-framework/graphql`, and `@nl-framework/microservices` are **optional** peers
— you only need the ones whose transport you test (they are loaded lazily).

## The testing module

`Test.createTestingModule()` builds an `ApplicationContext` in which overrides are
registered **before any provider is instantiated**, so every dependent receives
the substitute rather than the original.

```ts
import { Test } from '@nl-framework/testing';

const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
  providers: [/* extra providers */],
})
  .overrideProvider(UserService).useValue(mockUserService)
  .overrideProvider(CONFIG_TOKEN).useFactory({ factory: () => testConfig })
  .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
  .overrideInterceptor(CacheInterceptor).useValue(passthroughInterceptor)
  .overrideFilter(HttpExceptionFilter).useClass(TestFilter)
  .compile();

const service = await moduleRef.get(UserService);

// ...assertions...

await moduleRef.close(); // runs the shutdown lifecycle (onModuleDestroy)
```

Guards, interceptors, filters, and pipes all resolve through the container at
runtime, so `overrideGuard`/`overrideInterceptor`/`overrideFilter`/`overridePipe`
are token swaps handled by the same mechanism as `overrideProvider`.

Each override terminal supports `.useValue(v)`, `.useClass(C)`, and
`.useFactory({ factory, inject? })`.

## HTTP

No port is bound — requests go straight through `HttpApplication.handle`.

```ts
const app = await moduleRef.createHttpApplication();

const res = await app.request('/users/42', { headers: { 'x-token': 'secret' } });
// res is a standard Response

const { status, body } = await app.requestJson('/users', {
  method: 'POST',
  json: { name: 'Grace' }, // serialized, content-type defaulted to application/json
});
```

## GraphQL

Executes via Apollo's `executeOperation`, with the framework's scoped container
resolver attached so guards and interceptors run exactly as they would over HTTP.

```ts
const gql = await moduleRef.createGraphqlApplication();

const { data, errors } = await gql.execute<{ report: { message: string } }>({
  query: /* GraphQL */ `query ($score: Int!) { report(score: $score) { message } }`,
  variables: { score: 7 },
});
```

> The GraphQL schema metadata is a process-global singleton. If you declare types
> at module scope across several test files, reset it between cases with
> `GraphqlMetadataStorage.get().clear()` (and `clearGraphqlGuards()` /
> `clearGraphqlInterceptors()` if you register global ones).

## Microservices

Drives `MessageDispatcher` through an in-memory transport — no Dapr sidecar.

```ts
const harness = await moduleRef.createMicroserviceHarness();
// defaults to the module's discovered controllers; pass { controllers: [...] } to scope it

const result = await harness.send<number>('math.double', { value: 21 }); // 42
await harness.emit('math.logged', { value: 5 }); // fire-and-forget event
```

`InMemoryTransport` is also exported directly, e.g. to wire into
`createMicroservicesModule({ transport })`.

## Repositories (ORM)

`InMemoryRepository<T>` is a dependency-free, in-memory implementation of the full
`OrmRepository` contract — `find` / `findOne` / `findById` / `count` / `insertOne`
/ `insertMany` / `save` / `updateMany` / `softDelete` / `restore` / `deleteHard` /
`deleteMany`. It mirrors `MongoRepository`'s behavior: string `id` + `_id`
assignment, `timestamps`, and `softDelete` semantics, with a Mongo-style filter
matcher (`$and` / `$or` / `$in` / `$exists` / `$gt…$lte` / `$regex`, dot paths).
No real MongoDB, no `mongodb-memory-server`.

```ts
import { InMemoryRepository, createInMemoryRepository } from '@nl-framework/testing';
import { getRepositoryToken } from '@nl-framework/orm';

// Direct construction (defaults timestamps + softDelete to true, like @Document):
const repo = new InMemoryRepository(User, {
  seed: [{ name: 'Ada', age: 36 }],
});

// Or read timestamps/softDelete/collection straight from the entity's @Document:
const repo2 = await createInMemoryRepository(User, { seed: [/* ... */] });

const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(getRepositoryToken(User))
  .useValue(repo)
  .compile();
```

Extra test conveniences: `repo.snapshot()` (isolated clones of all docs),
`repo.size`, and `repo.clear()`. The fake does not emit write-notifier events.

> `@nl-framework/orm` is an optional peer. `InMemoryRepository`'s constructor has
> no ORM runtime dependency; only `createInMemoryRepository` (which reads
> `@Document` metadata) lazily imports the ORM.

## License

Apache-2.0
