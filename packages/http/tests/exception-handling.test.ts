import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Controller, Module } from '@nl-framework/core';
import {
  clearExceptionFilters,
  clearHttpGuards,
  clearHttpInterceptors,
  clearHttpRouteRegistrars,
  createHttpApplication,
  Get,
  HttpException,
  type HttpApplication,
} from '../src/index';

const ORIGIN = 'http://errors.local';

@Controller('/errors')
class ErrorController {
  @Get('/http')
  http() {
    throw HttpException.notFound('no such widget');
  }

  @Get('/http-conflict')
  conflict() {
    throw HttpException.conflict('already exists');
  }

  @Get('/boom')
  boom() {
    throw new Error('secret internal detail');
  }
}

@Module({ controllers: [ErrorController] })
class ErrorModule {}

describe('HTTP default exception handling', () => {
  let app: HttpApplication | undefined;

  const dispatch = (path: string) => app!.handle(new Request(`${ORIGIN}${path}`));

  beforeEach(async () => {
    clearHttpRouteRegistrars();
    clearHttpGuards();
    clearHttpInterceptors();
    clearExceptionFilters();
    app = await createHttpApplication(ErrorModule, { port: 0 });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it('maps a thrown HttpException to its status and message with no filter', async () => {
    const res = await dispatch('/errors/http');
    expect(res.status).toBe(404);
    const body = (await res.json()) as { statusCode: number; message: string };
    expect(body.statusCode).toBe(404);
    expect(body.message).toBe('no such widget');

    const conflict = await dispatch('/errors/http-conflict');
    expect(conflict.status).toBe(409);
    expect(((await conflict.json()) as { message: string }).message).toBe('already exists');
  });

  it('maps an unknown error to a generic 500 without leaking internals', async () => {
    const res = await dispatch('/errors/boom');
    expect(res.status).toBe(500);
    const body = (await res.json()) as { statusCode: number; message: string };
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('Internal Server Error');
    expect(JSON.stringify(body)).not.toContain('secret internal detail');
  });
});
