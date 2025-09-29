import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { Controller, Injectable, Module } from '@nl-framework/core';
import {
  clearHttpRouteRegistrars,
  createHttpApplication,
  Get,
  registerHttpRouteRegistrar,
  type MiddlewareHandler,
} from '../src/index';
import type { RequestContext } from '../src/interfaces/http';

@Injectable()
class MessageService {
  getMessage(name: string) {
    return `Hello ${name}`;
  }
}

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

describe('HTTP Application', () => {
  let appUnderTest: Awaited<ReturnType<typeof createHttpApplication>>;

  beforeEach(() => {
    clearHttpRouteRegistrars();
  });

  afterEach(async () => {
    if (appUnderTest) {
      await appUnderTest.close();
    }
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
});
