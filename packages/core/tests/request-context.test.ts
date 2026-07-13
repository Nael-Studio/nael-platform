import { describe, expect, it } from 'bun:test';
import { RequestContext, createRequestContextData } from '../src/index';

const nextTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('RequestContext', () => {
  it('exposes the active context and id inside run()', () => {
    const data = createRequestContextData({ kind: 'http', name: 'GET /users' });
    const seen = RequestContext.run(data, () => ({
      id: RequestContext.id(),
      current: RequestContext.current(),
    }));

    expect(seen.id).toBe(data.requestId);
    expect(seen.current?.name).toBe('GET /users');
    expect(seen.current?.kind).toBe('http');
  });

  it('returns undefined outside any context', () => {
    expect(RequestContext.current()).toBeUndefined();
    expect(RequestContext.id()).toBeUndefined();
  });

  it('generates a UUID when no requestId is provided, and reuses an inbound one', () => {
    const generated = createRequestContextData({ kind: 'http', name: 'x' });
    expect(generated.requestId).toMatch(/[0-9a-f-]{36}/);

    const inbound = createRequestContextData({ kind: 'http', name: 'x', requestId: 'abc-123' });
    expect(inbound.requestId).toBe('abc-123');
  });

  it('restores the outer context after a nested run()', () => {
    const outer = createRequestContextData({ kind: 'http', name: 'outer', requestId: 'outer' });
    const inner = createRequestContextData({ kind: 'message', name: 'inner', requestId: 'inner' });

    RequestContext.run(outer, () => {
      expect(RequestContext.id()).toBe('outer');
      RequestContext.run(inner, () => {
        expect(RequestContext.id()).toBe('inner');
      });
      expect(RequestContext.id()).toBe('outer');
    });

    expect(RequestContext.id()).toBeUndefined();
  });

  it('isolates concurrent async chains', async () => {
    const results: string[] = [];

    const chain = (id: string) =>
      RequestContext.run(createRequestContextData({ kind: 'http', name: id, requestId: id }), async () => {
        await nextTick();
        results.push(`${id}:${RequestContext.id()}`);
      });

    await Promise.all([chain('a'), chain('b'), chain('c')]);

    expect(results.sort()).toEqual(['a:a', 'b:b', 'c:c']);
  });

  it('set() attaches fields to the active context and no-ops outside one', () => {
    RequestContext.set('ignored', true); // no throw outside a context

    RequestContext.run(createRequestContextData({ kind: 'http', name: 'x' }), () => {
      RequestContext.set('userId', 'u1');
      expect(RequestContext.current()?.userId).toBe('u1');
    });
  });

  it('start() opens a context from options and passes the data to the callback', () => {
    const captured = RequestContext.start({ kind: 'graphql', name: 'query me' }, (data) => {
      expect(RequestContext.id()).toBe(data.requestId);
      return data.name;
    });
    expect(captured).toBe('query me');
  });
});
