import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { Controller, Injectable, Module } from '@nl-framework/core';
import {
  clearHttpGuards,
  clearHttpInterceptors,
  clearHttpRouteRegistrars,
  createHttpApplication,
  Get,
  Post,
  registerHttpGuard,
  registerHttpInterceptor,
  registerHttpRouteRegistrar,
  UseGuards,
  UseInterceptors,
  UseFilters,
  Body,
  Param,
  Query,
  Headers,
  Req,
  Context,
  createHttpParamDecorator,
  type CanActivate,
  type GuardFunction,
  type HttpExecutionContext,
  type CallHandler,
  type HttpInterceptor,
  type InterceptorFunction,
  type MiddlewareHandler,
  type ExceptionFilter,
  registerExceptionFilter,
  clearExceptionFilters,
} from '../src/index';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
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
  constructor(private readonly service: MessageService) { }

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

const CurrentUser = createHttpParamDecorator<string | undefined>((property, ctx) => {
  const user = {
    id: ctx.headers.get('x-user-id'),
    role: ctx.headers.get('x-user-role'),
  } as const;
  if (!property) {
    return user;
  }
  return user[property as keyof typeof user];
});

@Controller('/greetings')
class GreetingController {
  constructor(private readonly service: MessageService) { }

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
class GreetingModule { }

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
class GuardedModule { }

class CreatePayloadDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  count?: number;
}

@Controller('/payloads')
class PayloadController {
  @Post('/')
  echo(@Body() payload: { message: string }) {
    return payload;
  }

  @Post('/message')
  project(@Body('message') message: string) {
    return { message };
  }

  @Post('/validated')
  createValidated(@Body() payload: CreatePayloadDto) {
    return payload;
  }

  @Get('/params/:id')
  byId(@Param('id') id: string) {
    return { id };
  }

  @Get('/query')
  search(@Query('term') term: string | null) {
    return { term };
  }

  @Get('/headers')
  readHeader(@Headers('x-flag') flag: string | null) {
    return { flag };
  }

  @Get('/request/:id')
  inspectRequest(@Req() request: Request, @Param('id') id: string) {
    return { id, url: request.url };
  }

  @Get('/context')
  exposeContext(@Context() ctx: RequestContext) {
    return { path: ctx.route.definition.path };
  }

  @Get('/custom')
  readCustom(@CurrentUser('role') role: string | null, @CurrentUser() user: { id: string | null; role: string | null }) {
    return { role, user };
  }
}

@Module({
  controllers: [PayloadController],
})
class PayloadModule { }

const interceptorOrder: string[] = [];
let cachedHandlerInvocations = 0;

@Injectable()
class EnvelopeInterceptor implements HttpInterceptor {
  async intercept(_: HttpExecutionContext, next: CallHandler) {
    interceptorOrder.push('controller-before');
    const result = await next.handle();
    if (result instanceof Response) {
      interceptorOrder.push('controller-after');
      return result;
    }
    interceptorOrder.push('controller-after');
    return { data: result };
  }
}

const cacheInterceptor: InterceptorFunction = async () => new Response('cached-response');

const methodTraceInterceptor: InterceptorFunction = async (_context, next) => {
  interceptorOrder.push('method-before');
  const result = await next.handle();
  interceptorOrder.push('method-after');
  return result;
};

@UseInterceptors(EnvelopeInterceptor)
@Controller('/interceptors')
class InterceptorController {
  @Get()
  read() {
    return { status: 'ok' } as const;
  }

  @UseInterceptors(cacheInterceptor)
  @Get('/cached')
  cached() {
    cachedHandlerInvocations += 1;
    return { status: 'unreachable' } as const;
  }

  @UseInterceptors(methodTraceInterceptor)
  @Get('/trace')
  trace() {
    interceptorOrder.push('handler');
    return { status: 'trace' } as const;
  }
}

@Module({
  providers: [EnvelopeInterceptor],
  controllers: [InterceptorController],
})
class InterceptorModule { }

class MethodError extends Error {}
class ControllerError extends Error {}

const controllerLevelFilter: ExceptionFilter = {
  catch(exception: Error) {
    if (exception instanceof ControllerError) {
      return new Response(
        JSON.stringify({ message: 'controller-filter' }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    throw exception;
  },
};

class MethodFilter implements ExceptionFilter {
  catch(exception: Error, context: RequestContext) {
    if (exception instanceof MethodError) {
      return new Response(
        JSON.stringify({ scope: 'method', path: context.route.definition.path }),
        {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    throw exception;
  }
}

@Injectable()
class InjectableFilter implements ExceptionFilter {
  constructor(private readonly service: MessageService) { }

  catch(exception: Error) {
    if (exception instanceof MethodError) {
      return new Response(
        JSON.stringify({ message: this.service.getMessage('filtered') }),
        {
          status: 498,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    throw exception;
  }
}

@UseFilters(controllerLevelFilter)
@Controller('/filters')
class FilterController {
  @UseFilters(MethodFilter)
  @Get('/method')
  method() {
    throw new MethodError('handler');
  }

  @Get('/controller')
  controller() {
    throw new ControllerError('controller');
  }

  @UseFilters(InjectableFilter)
  @Get('/injectable')
  injectable() {
    throw new MethodError('di');
  }
}

@Module({
  providers: [MessageService, InjectableFilter],
  controllers: [FilterController],
})
class FilterModule { }

describe('HTTP Application', () => {
  let appUnderTest: Awaited<ReturnType<typeof createHttpApplication>>;

  beforeEach(() => {
    clearHttpRouteRegistrars();
    clearHttpGuards();
    clearHttpInterceptors();
    clearExceptionFilters();
    interceptorOrder.length = 0;
    cachedHandlerInvocations = 0;
  });

  afterEach(async () => {
    if (appUnderTest) {
      await appUnderTest.close();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      appUnderTest = undefined as any;
    }
    clearHttpGuards();
    clearHttpInterceptors();
    clearExceptionFilters();
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

  it('injects request data via parameter decorators', async () => {
    appUnderTest = await createHttpApplication(PayloadModule, { port: 0 });
    const server = await appUnderTest.listen();

    const echo = await fetch(`http://127.0.0.1:${server.port}/payloads`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ message: 'hello' }),
    });
    expect(echo.status).toBe(200);
    expect(await echo.json()).toEqual({ message: 'hello' });

    const projected = await fetch(`http://127.0.0.1:${server.port}/payloads/message`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ message: 'projected' }),
    });
    expect(projected.status).toBe(200);
    expect(await projected.json()).toEqual({ message: 'projected' });

    const params = await fetch(`http://127.0.0.1:${server.port}/payloads/params/123`);
    expect(params.status).toBe(200);
    expect(await params.json()).toEqual({ id: '123' });

    const query = await fetch(`http://127.0.0.1:${server.port}/payloads/query?term=bun`);
    expect(query.status).toBe(200);
    expect(await query.json()).toEqual({ term: 'bun' });

    const headers = await fetch(`http://127.0.0.1:${server.port}/payloads/headers`, {
      headers: {
        'x-flag': 'true',
      },
    });
    expect(headers.status).toBe(200);
    expect(await headers.json()).toEqual({ flag: 'true' });

    const requestInspection = await fetch(`http://127.0.0.1:${server.port}/payloads/request/alpha`);
    expect(requestInspection.status).toBe(200);
    expect(await requestInspection.json()).toEqual({
      id: 'alpha',
      url: `http://127.0.0.1:${server.port}/payloads/request/alpha`,
    });

    const contextExposure = await fetch(`http://127.0.0.1:${server.port}/payloads/context`);
    expect(contextExposure.status).toBe(200);
    expect(await contextExposure.json()).toEqual({ path: '/context' });

    const customDecorator = await fetch(`http://127.0.0.1:${server.port}/payloads/custom`, {
      headers: {
        'x-user-id': '42',
        'x-user-role': 'admin',
      },
    });
    expect(customDecorator.status).toBe(200);
    expect(await customDecorator.json()).toEqual({
      role: 'admin',
      user: { id: '42', role: 'admin' },
    });

    const created = await fetch(`http://127.0.0.1:${server.port}/payloads/validated`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ message: 'validated', count: '5', extra: 'nope' }),
    });
    expect(created.status).toBe(200);
    expect(await created.json()).toEqual({ message: 'validated', count: 5 });

    const invalid = await fetch(`http://127.0.0.1:${server.port}/payloads/validated`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ count: 'not-a-number' }),
    });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({
      message: 'Validation failed',
      issues: expect.arrayContaining([
        expect.objectContaining({ property: 'message' }),
      ]),
    });
  });

  it('applies controller and handler interceptors', async () => {
    appUnderTest = await createHttpApplication(InterceptorModule, { port: 0 });
    const server = await appUnderTest.listen();

    const wrapped = await fetch(`http://127.0.0.1:${server.port}/interceptors`);
    expect(wrapped.status).toBe(200);
    expect(await wrapped.json()).toEqual({ data: { status: 'ok' } });

    const cached = await fetch(`http://127.0.0.1:${server.port}/interceptors/cached`);
    expect(cached.status).toBe(200);
    expect(await cached.text()).toBe('cached-response');
    expect(cachedHandlerInvocations).toBe(0);
  });

  it('runs global interceptors before controller and method interceptors', async () => {
    const tracingGlobalInterceptor: InterceptorFunction = async (_context, next) => {
      interceptorOrder.push('global-before');
      const result = await next.handle();
      interceptorOrder.push('global-after');
      return result;
    };

    registerHttpInterceptor(tracingGlobalInterceptor);

    appUnderTest = await createHttpApplication(InterceptorModule, { port: 0 });
    const server = await appUnderTest.listen();

    const traced = await fetch(`http://127.0.0.1:${server.port}/interceptors/trace`);
    expect(traced.status).toBe(200);
    expect(await traced.json()).toEqual({ data: { status: 'trace' } });

    expect(interceptorOrder).toEqual([
      'global-before',
      'controller-before',
      'method-before',
      'handler',
      'method-after',
      'controller-after',
      'global-after',
    ]);
  });

  it('applies controller and handler exception filters', async () => {
    appUnderTest = await createHttpApplication(FilterModule, { port: 0 });
    const server = await appUnderTest.listen();

    const methodResponse = await fetch(`http://127.0.0.1:${server.port}/filters/method`);
    expect(methodResponse.status).toBe(422);
    expect(await methodResponse.json()).toEqual({ scope: 'method', path: '/method' });

    const controllerResponse = await fetch(`http://127.0.0.1:${server.port}/filters/controller`);
    expect(controllerResponse.status).toBe(409);
    expect(await controllerResponse.json()).toEqual({ message: 'controller-filter' });
  });

  it('resolves exception filters through dependency injection', async () => {
    appUnderTest = await createHttpApplication(FilterModule, { port: 0 });
    const server = await appUnderTest.listen();

    const response = await fetch(`http://127.0.0.1:${server.port}/filters/injectable`);
    expect(response.status).toBe(498);
    expect(await response.json()).toEqual({ message: 'Hello filtered' });
  });

  it('runs registered global filters before scoped filters', async () => {
    registerExceptionFilter({
      catch: () =>
        new Response(
          JSON.stringify({ scope: 'global' }),
          {
            status: 599,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    });

    appUnderTest = await createHttpApplication(FilterModule, { port: 0 });
    const server = await appUnderTest.listen();

    const response = await fetch(`http://127.0.0.1:${server.port}/filters/method`);
    expect(response.status).toBe(599);
    expect(await response.json()).toEqual({ scope: 'global' });
  });
});
