import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Controller, Inject, Injectable, Module } from '@nl-framework/core';
import {
  clearExceptionFilters,
  clearHttpGuards,
  clearHttpInterceptors,
  clearHttpRouteRegistrars,
  Get,
  Param,
  Post,
} from '@nl-framework/http';
import { Query, Resolver, Int } from '@nl-framework/graphql';
import { NaelFactory, type NaelApplication } from '../src/index';

const ORIGIN = 'http://platform.local';

// --- HTTP-only fixtures ---------------------------------------------------

@Injectable()
class GreetService {
  greet(name: string): string {
    return `Hi ${name}`;
  }
}

@Controller('/hello')
class HelloController {
  constructor(private readonly service: GreetService) {}

  @Get('/:name')
  hi(@Param('name') name: string) {
    return { message: this.service.greet(name) };
  }
}

@Module({ providers: [GreetService], controllers: [HelloController] })
class HelloModule {}

// --- Shared-container fixtures (HTTP + GraphQL) ---------------------------

@Injectable()
class HitCounter {
  count = 0;
  increment(): number {
    this.count += 1;
    return this.count;
  }
}

@Controller('/counter')
class CounterController {
  constructor(private readonly counter: HitCounter) {}

  @Post('/hit')
  hit() {
    return { count: this.counter.increment() };
  }
}

@Resolver()
class CounterResolver {
  constructor(private readonly counter: HitCounter) {}

  // Method name deliberately differs from the injected field to avoid the
  // TS parameter-property assignment shadowing a same-named prototype method.
  @Query(() => Int, { name: 'counter' })
  currentCount() {
    return this.counter.count;
  }
}

@Module({
  providers: [HitCounter],
  controllers: [CounterController],
  resolvers: [CounterResolver],
})
class CounterModule {}

// --- Broken DI fixture ----------------------------------------------------

const MISSING_TOKEN = Symbol('missing-config-token');

@Controller('/broken')
class BrokenController {
  // Injects a token that is never provided by the module — unlike a zero-arg
  // class, the container cannot auto-construct it, so resolution must fail.
  constructor(@Inject(MISSING_TOKEN) private readonly config: unknown) {}

  @Get()
  read() {
    return { ok: Boolean(this.config) };
  }
}

@Module({ controllers: [BrokenController] })
class BrokenModule {}

describe('NaelFactory', () => {
  let app: NaelApplication | undefined;

  beforeEach(() => {
    clearHttpRouteRegistrars();
    clearHttpGuards();
    clearHttpInterceptors();
    clearExceptionFilters();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it('creates an HTTP-only app whose controller route responds via handle()', async () => {
    app = await NaelFactory.create(HelloModule);

    const httpApp = app.getHttpApplication();
    expect(httpApp).toBeDefined();
    expect(app.getGraphqlApplication()).toBeUndefined();

    const res = await httpApp!.handle(new Request(`${ORIGIN}/hello/ada`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: 'Hi ada' });
  });

  it('shares one DI container across HTTP and GraphQL (same provider instance)', async () => {
    app = await NaelFactory.create(CounterModule);

    const httpApp = app.getHttpApplication();
    expect(httpApp).toBeDefined();
    // GraphQL is enabled purely by resolver discovery.
    expect(app.getGraphqlApplication()).toBeDefined();

    // Mutate the singleton through the HTTP controller...
    await httpApp!.handle(new Request(`${ORIGIN}/counter/hit`, { method: 'POST' }));
    await httpApp!.handle(new Request(`${ORIGIN}/counter/hit`, { method: 'POST' }));

    // ...and observe that the controller and the resolver hold the *same*
    // HitCounter instance from the one shared container — so the resolver sees
    // the mutations made through the HTTP controller.
    const service = await app.get(HitCounter);
    const controller = await app.get(CounterController);
    const resolver = await app.get(CounterResolver);

    expect((controller as unknown as { counter: HitCounter }).counter).toBe(service);
    expect((resolver as unknown as { counter: HitCounter }).counter).toBe(service);
    expect(service.count).toBe(2);
    expect((resolver as unknown as { counter: HitCounter }).counter.count).toBe(2);
  });

  it('constructs the gateway options path without composing or hitting the network', async () => {
    app = await NaelFactory.create(HelloModule, {
      gateway: {
        subgraphs: [{ name: 'accounts', url: 'http://127.0.0.1:59999/graphql' }],
      },
    });

    // The gateway is built but lazy — it only introspects subgraphs on start()/
    // listen(), neither of which we call here, so no network occurs.
    expect(app.getGatewayApplication()).toBeDefined();
    expect(app.getHttpApplication()).toBeDefined();

    // A normal controller route still works alongside the mounted gateway.
    const res = await app.getHttpApplication()!.handle(new Request(`${ORIGIN}/hello/sam`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: 'Hi sam' });
  });

  it('surfaces a clear framework error for an unresolvable dependency', async () => {
    // A missing provider should yield an actionable message from the container,
    // not an opaque stack-trace, and it should fail at bootstrap time.
    await expect(NaelFactory.create(BrokenModule)).rejects.toThrow(
      /Provider for token .*missing-config-token.* not found/,
    );
  });
});
