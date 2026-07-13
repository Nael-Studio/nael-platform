import { describe, expect, it } from 'bun:test';
import { Application, Controller, DiscoveryService, Injectable, Module } from '@nl-framework/core';
import { Delete, Get, Post, UseFilters, UseGuards, UseInterceptors, UsePipes } from '@nl-framework/http';
import { buildRouteCatalog, type EndpointDescriptor } from '../src/introspection/routes';
import { renderDashboardHtml } from '../src/http/dashboard-html';

class AuthGuard {}
class RoleGuard {}
class LoggingInterceptor {}
class ValidationPipe {}
class HttpErrorFilter {}

@UseGuards(AuthGuard)
@Controller('/users')
class UsersController {
  @Get('/')
  list() {}

  @Get(':id')
  find() {}

  @UseGuards(RoleGuard)
  @UseInterceptors(LoggingInterceptor)
  @UsePipes(ValidationPipe)
  @UseFilters(HttpErrorFilter)
  @Post('/')
  create() {}

  @Delete(':id')
  remove() {}
}

@Injectable()
class HealthService {}

@Controller()
class RootController {
  @Get('health')
  health() {}
}

@Module({
  providers: [HealthService],
  controllers: [UsersController, RootController],
})
class RoutesAppModule {}

const http = (catalog: ReturnType<typeof buildRouteCatalog>, method: string, path: string): EndpointDescriptor | undefined =>
  catalog.endpoints.find((e) => e.kind === 'http' && e.method === method && e.path === path);

describe('buildRouteCatalog', () => {
  it('lists every HTTP route with its full path and handler', async () => {
    const app = new Application();
    const context = await app.bootstrap(RoutesAppModule);
    const discovery = await context.get(DiscoveryService);

    const catalog = buildRouteCatalog(discovery);

    expect(http(catalog, 'GET', '/users')).toBeDefined();
    expect(http(catalog, 'GET', '/users/:id')).toBeDefined();
    expect(http(catalog, 'POST', '/users')).toBeDefined();
    expect(http(catalog, 'DELETE', '/users/:id')).toBeDefined();
    // Prefix-less controller: leading slash preserved, no doubled slashes.
    expect(http(catalog, 'GET', '/health')).toBeDefined();

    const list = http(catalog, 'GET', '/users')!;
    expect(list.controller).toBe('UsersController');
    expect(list.handler).toBe('list');

    await app.close();
  });

  it('resolves the guard / interceptor / pipe / filter chain per handler', async () => {
    const app = new Application();
    const context = await app.bootstrap(RoutesAppModule);
    const discovery = await context.get(DiscoveryService);

    const catalog = buildRouteCatalog(discovery);

    // Class-level guard applies to every handler of the controller.
    const list = http(catalog, 'GET', '/users')!;
    expect(list.guards).toContain('AuthGuard');

    // Method-level decorators stack on top of the class-level guard.
    const create = http(catalog, 'POST', '/users')!;
    expect(create.guards).toEqual(expect.arrayContaining(['AuthGuard', 'RoleGuard']));
    expect(create.interceptors).toContain('LoggingInterceptor');
    expect(create.pipes).toContain('ValidationPipe');
    expect(create.filters).toContain('HttpErrorFilter');

    // The prefix-less route carries no decorators.
    const health = http(catalog, 'GET', '/health')!;
    expect(health.guards).toEqual([]);

    await app.close();
  });

  it('reports stats and sorts http before graphql', async () => {
    const app = new Application();
    const context = await app.bootstrap(RoutesAppModule);
    const discovery = await context.get(DiscoveryService);

    const catalog = buildRouteCatalog(discovery);

    expect(catalog.stats.http).toBe(5);
    // Every route here is guarded except the prefix-less /health one.
    expect(catalog.stats.guarded).toBe(4);
    expect(catalog.endpoints.every((e) => e.kind === 'http')).toBe(true);

    await app.close();
  });

  it('renders a Routes tab into the dashboard shell', () => {
    const html = renderDashboardHtml({ basePath: '/__nael', title: 'Nael DevTools' });
    expect(html).toContain('data-tab="routes"');
    expect(html).toContain('id="tab-routes"');
    expect(html).toContain('/api/routes');
  });
});
