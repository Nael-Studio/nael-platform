import { describe, expect, it } from 'bun:test';
import { Application, Controller, DiscoveryService, Injectable, Module } from '@nl-framework/core';
import { buildSystemGraph } from '../src/introspection/graph';

@Injectable()
class LoggerSvc {}

@Injectable()
class UserService {
  constructor(private readonly log: LoggerSvc) {}
}

@Controller('/users')
class UsersController {
  constructor(private readonly users: UserService) {}
}

@Module({
  providers: [LoggerSvc, UserService],
  controllers: [UsersController],
})
class UsersModule {}

@Module({ imports: [UsersModule] })
class GraphAppModule {}

const hasEdge = (
  edges: ReturnType<typeof buildSystemGraph>['edges'],
  kind: string,
  from: string,
  to: string,
): boolean => edges.some((e) => e.kind === kind && e.from === from && e.to === to);

describe('buildSystemGraph', () => {
  it('builds module, provider, controller nodes and import/provide/inject edges', async () => {
    const app = new Application();
    const context = await app.bootstrap(GraphAppModule);
    const discovery = await context.get(DiscoveryService);

    const graph = buildSystemGraph(discovery);
    const ids = new Set(graph.nodes.map((n) => n.id));

    expect(ids.has('module:GraphAppModule')).toBe(true);
    expect(ids.has('module:UsersModule')).toBe(true);
    expect(ids.has('provider:UserService')).toBe(true);
    expect(ids.has('provider:LoggerSvc')).toBe(true);
    expect(ids.has('provider:UsersController')).toBe(true);

    const controllerNode = graph.nodes.find((n) => n.id === 'provider:UsersController');
    expect(controllerNode?.kind).toBe('controller');
    expect(controllerNode?.module).toBe('UsersModule');

    // module import edge
    expect(hasEdge(graph.edges, 'imports', 'module:GraphAppModule', 'module:UsersModule')).toBe(true);
    // ownership edges
    expect(hasEdge(graph.edges, 'provides', 'module:UsersModule', 'provider:UserService')).toBe(true);
    // constructor-injection edges
    expect(hasEdge(graph.edges, 'injects', 'provider:UserService', 'provider:LoggerSvc')).toBe(true);
    expect(hasEdge(graph.edges, 'injects', 'provider:UsersController', 'provider:UserService')).toBe(true);

    expect(graph.stats.modules).toBeGreaterThanOrEqual(2);
    expect(graph.stats.controllers).toBeGreaterThanOrEqual(1);

    await app.close();
  });

  it('never emits self edges', async () => {
    const app = new Application();
    const context = await app.bootstrap(GraphAppModule);
    const discovery = await context.get(DiscoveryService);

    const graph = buildSystemGraph(discovery);
    expect(graph.edges.every((e) => e.from !== e.to)).toBe(true);

    await app.close();
  });
});

describe('graph dashboard UX', () => {
  it('renders the toolbar, zoom/pan, focus, and hull machinery', async () => {
    const { renderDashboardHtml } = await import('../src/http/dashboard-html');
    const html = renderDashboardHtml({ basePath: '/__nael', title: 'x' });
    const script = /<script\b[^>]*>([\s\S]*?)<\/script\b[^>]*>/i.exec(html)![1];
    // the inline graph script is syntactically valid
    expect(() => new Function(script)).not.toThrow();
    for (const feature of [
      'hide framework internals',
      'group by module',
      'function isInternal',
      'function drawHulls',
      'toggleFocus',
      'cursor-anchored',
    ]) {
      expect(script).toContain(feature);
    }
  });
});
