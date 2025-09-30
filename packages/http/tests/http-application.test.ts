import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { Controller, Injectable, Module } from '@nl-framework/core';
import {
  clearHttpGuards,
  clearHttpRouteRegistrars,
  createHttpApplication,
  Get,
  registerHttpGuard,
  registerHttpRouteRegistrar,
  UseGuards,
  type CanActivate,
  type GuardFunction,
  type HttpExecutionContext,
  type MiddlewareHandler,
} from '../src/index';
import type { RequestContext } from '../src/interfaces/http';

@Injectable()
class MessageService {
  getMessage(name: string) {
    return `Hello ${name}`;
  }
}

@Injectable()
class HeaderGuard implements CanActivate {
  canActivate(context: HttpExecutionContext): boolean {
    return context.getRequest().headers.get('x-allow') === 'true';
  }
}

type GuardedRequestContext = RequestContext & { guardMessage?: string };

@Injectable()
class PersonalizedGuard implements CanActivate {
  constructor(private readonly service: MessageService) {}

  canActivate(context: HttpExecutionContext): boolean {
    const request = context.getRequest();
    const name = request.headers.get('x-name');
    if (!name) {
      return false;
    }

    (context.context as GuardedRequestContext).guardMessage = this.service.getMessage(name);
    return true;
  }
}

const allowGuard: GuardFunction = () => true;
const handlerResponseGuard: GuardFunction = async () =>
  new Response('handler-blocked', { status: 418 });

@Controller('/greetings')
class GreetingController {
  constructor(private readonly service: MessageService) {}

  @Get('/:name')
  respond(ctx: RequestContext) {
    const name = ctx.params.name ?? 'anonymous';
    return { message: this.service.getMessage(name) };
  }
}

@Module({
  providers: [MessageService],
  controllers: [GreetingController],
})
class GreetingModule {}

@UseGuards(HeaderGuard)
@Controller('/protected')
class ProtectedController {
  @Get()
  read() {
    return { status: 'protected' } as const;
  }

  @UseGuards(allowGuard)
  @Get('/open')
  open() {
    return { status: 'open' } as const;
  }

  @UseGuards(handlerResponseGuard)
  @Get('/blocked')
  blocked() {
    return { status: 'unreachable' } as const;
  }
}

@UseGuards(PersonalizedGuard)
@Controller('/personalized')
class PersonalizedController {
  @Get()
  info(context: GuardedRequestContext) {
    return { message: context.guardMessage ?? null };
  }
}

@Module({
  providers: [MessageService, HeaderGuard, PersonalizedGuard],
  controllers: [ProtectedController, PersonalizedController],
})
class GuardedModule {}

describe('HTTP Application', () => {
  let appUnderTest: Awaited<ReturnType<typeof createHttpApplication>>;

  beforeEach(() => {
    clearHttpRouteRegistrars();
    clearHttpGuards();
  });

  afterEach(async () => {
    if (appUnderTest) {
      await appUnderTest.close();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      appUnderTest = undefined as any;
    }
    clearHttpGuards();
  });

  it('handles requests through registered controllers', async () => {
    appUnderTest = await createHttpApplication(GreetingModule, {
      port: 0,
    });

    const server = await appUnderTest.listen();

    const response = await fetch(`http://127.0.0.1:${server.port}/greetings/world`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ message: 'Hello world' });
  });

  it('runs middleware before controller handlers', async () => {
    const requestIds: string[] = [];

    const middleware: MiddlewareHandler = async (ctx, next) => {
      requestIds.push(ctx.request.headers.get('x-id') ?? '');
      const response = await next();
      return response;
    };

    appUnderTest = await createHttpApplication(GreetingModule, {
      port: 0,
      middleware: [middleware],
    });

    const server = await appUnderTest.listen();
    await fetch(`http://127.0.0.1:${server.port}/greetings/tester`, {
      headers: {
        'x-id': 'middleware-check',
      },
    });

    expect(requestIds).toEqual(['middleware-check']);
  });

  it('runs registered HTTP route registrars', async () => {
    registerHttpRouteRegistrar(({ registerRoute }) => {
      registerRoute('GET', '/dynamic', () => new Response('dynamic-route'));
    });

    appUnderTest = await createHttpApplication(GreetingModule, { port: 0 });
    const server = await appUnderTest.listen();

    const response = await fetch(`http://127.0.0.1:${server.port}/dynamic`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('dynamic-route');
  });

  it('executes guards before controller handlers', async () => {
    registerHttpGuard((executionContext) => {
      const route = executionContext.getRoute();
      if (route.definition.path === '/:name') {
        return new Response('guarded', { status: 401 });
      }
    });

    appUnderTest = await createHttpApplication(GreetingModule, { port: 0 });
    const server = await appUnderTest.listen();

    const response = await fetch(`http://127.0.0.1:${server.port}/greetings/blocked`);
    expect(response.status).toBe(401);
    expect(await response.text()).toBe('guarded');
  });

  it('applies @UseGuards on controllers', async () => {
    appUnderTest = await createHttpApplication(GuardedModule, { port: 0 });
    const server = await appUnderTest.listen();

    const blocked = await fetch(`http://127.0.0.1:${server.port}/protected`);
    expect(blocked.status).toBe(403);

    const allowed = await fetch(`http://127.0.0.1:${server.port}/protected`, {
      headers: {
        'x-allow': 'true',
      },
    });
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toEqual({ status: 'protected' });
  });

  it('runs handler-level guards after controller guards', async () => {
    appUnderTest = await createHttpApplication(GuardedModule, { port: 0 });
    const server = await appUnderTest.listen();

    const blocked = await fetch(`http://127.0.0.1:${server.port}/protected/blocked`, {
      headers: {
        'x-allow': 'true',
      },
    });
    expect(blocked.status).toBe(418);
    expect(await blocked.text()).toBe('handler-blocked');

    const open = await fetch(`http://127.0.0.1:${server.port}/protected/open`, {
      headers: {
        'x-allow': 'true',
      },
    });
    expect(open.status).toBe(200);
    expect(await open.json()).toEqual({ status: 'open' });
  });

  it('resolves guard instances via dependency injection', async () => {
    appUnderTest = await createHttpApplication(GuardedModule, { port: 0 });
    const server = await appUnderTest.listen();

    const denied = await fetch(`http://127.0.0.1:${server.port}/personalized`);
    expect(denied.status).toBe(403);

    const allowed = await fetch(`http://127.0.0.1:${server.port}/personalized`, {
      headers: {
        'x-name': 'world',
      },
    });
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toEqual({ message: 'Hello world' });
  });
});
