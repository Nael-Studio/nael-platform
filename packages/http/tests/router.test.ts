import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Controller, Module } from '@nl-framework/core';
import {
  clearExceptionFilters,
  clearHttpGuards,
  clearHttpInterceptors,
  clearHttpRouteRegistrars,
  createHttpApplication,
  Get,
  Param,
  Post,
  Version,
  type HttpApplication,
} from '../src/index';

const ORIGIN = 'http://router.local';

@Controller('/catalog')
class CatalogController {
  @Get('/status')
  status() {
    return { route: 'static' } as const;
  }

  @Get('/:id')
  byId(ctx: { params: Record<string, string> }) {
    return { route: 'param', id: ctx.params.id };
  }

  @Get('/:id/reviews/:reviewId')
  nested(@Param('id') id: string, @Param('reviewId') reviewId: string) {
    return { id, reviewId };
  }

  @Post('/:id')
  create(@Param('id') id: string) {
    return { created: id };
  }
}

@Module({ controllers: [CatalogController] })
class CatalogModule {}

// Two versions of the same logical route, distinguished only by @Version.
@Controller('/reports')
class ReportsController {
  @Version('1')
  @Get()
  v1() {
    return { version: 'v1' } as const;
  }

  @Version('2')
  @Get()
  v2() {
    return { version: 'v2' } as const;
  }

  @Get('/latest')
  latest() {
    return { version: 'agnostic' } as const;
  }
}

@Module({ controllers: [ReportsController] })
class ReportsModule {}

describe('HTTP router', () => {
  let app: HttpApplication | undefined;

  const dispatch = (path: string, init?: RequestInit) =>
    app!.handle(new Request(`${ORIGIN}${path}`, init));

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

  describe('matching', () => {
    beforeEach(async () => {
      app = await createHttpApplication(CatalogModule, { port: 0 });
    });

    it('routes a static segment ahead of the param route registered after it', async () => {
      const res = await dispatch('/catalog/status');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ route: 'static' });
    });

    it('captures a single param segment', async () => {
      const res = await dispatch('/catalog/123');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ route: 'param', id: '123' });
    });

    it('captures multiple params and url-decodes them', async () => {
      const res = await dispatch('/catalog/a%20b/reviews/99');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ id: 'a b', reviewId: '99' });
    });

    it('matches on HTTP method — POST and GET on the same path hit different handlers', async () => {
      const created = await dispatch('/catalog/7', { method: 'POST' });
      expect(created.status).toBe(200);
      expect(await created.json()).toEqual({ created: '7' });

      const fetched = await dispatch('/catalog/7');
      expect(await fetched.json()).toEqual({ route: 'param', id: '7' });
    });

    it('returns 404 for an unmatched path', async () => {
      const res = await dispatch('/catalog/1/unknown/2/3');
      expect(res.status).toBe(404);
      expect(await res.text()).toBe('Not Found');
    });

    it('returns 404 (not 405) when the path exists but the method does not', async () => {
      // The router has no dedicated 405 path: an unregistered method on a known
      // path falls through to the same plain-text 404 as an unknown path.
      const res = await dispatch('/catalog/status', { method: 'DELETE' });
      expect(res.status).toBe(404);
      expect(await res.text()).toBe('Not Found');
    });
  });

  describe('versioning', () => {
    it('routes by URI version prefix when the uri strategy is enabled', async () => {
      app = await createHttpApplication(ReportsModule, {
        port: 0,
        versioning: { enabled: true, strategies: ['uri'] },
      });

      const v1 = await dispatch('/v1/reports');
      expect(v1.status).toBe(200);
      expect(await v1.json()).toEqual({ version: 'v1' });

      const v2 = await dispatch('/v2/reports');
      expect(v2.status).toBe(200);
      expect(await v2.json()).toEqual({ version: 'v2' });
    });

    it('routes by request header when the header strategy is enabled', async () => {
      app = await createHttpApplication(ReportsModule, {
        port: 0,
        versioning: { enabled: true, strategies: ['header'], headerName: 'x-api-version' },
      });

      const v2 = await dispatch('/reports', { headers: { 'x-api-version': '2' } });
      expect(v2.status).toBe(200);
      expect(await v2.json()).toEqual({ version: 'v2' });

      const v1 = await dispatch('/reports', { headers: { 'x-api-version': '1' } });
      expect(await v1.json()).toEqual({ version: 'v1' });
    });

    it('serves a version-agnostic route regardless of requested version', async () => {
      app = await createHttpApplication(ReportsModule, {
        port: 0,
        versioning: { enabled: true, strategies: ['uri'] },
      });

      const res = await dispatch('/v9/reports/latest');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ version: 'agnostic' });
    });
  });
});
