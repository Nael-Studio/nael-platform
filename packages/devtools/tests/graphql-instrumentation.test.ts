import { afterEach, describe, expect, it } from 'bun:test';
import { RequestContext } from '@nl-framework/core';
import type { GraphqlExecutionContext, GraphqlCallHandler } from '@nl-framework/graphql';
import { createGraphqlRequestInterceptor } from '../src/instrumentation/graphql-interceptor';
import { getDevtoolsBus, resetDevtoolsBusForTests } from '../src/instrumentation/bus';

afterEach(() => {
  resetDevtoolsBusForTests();
});

const ctxFor = (parent: string, field: string): GraphqlExecutionContext =>
  ({
    getInfo: () => ({ parentType: { name: parent }, fieldName: field }),
  }) as unknown as GraphqlExecutionContext;

const handler = (fn: () => unknown): GraphqlCallHandler =>
  ({ handle: async () => fn() }) as GraphqlCallHandler;

describe('createGraphqlRequestInterceptor', () => {
  it('emits a handler step per resolver, joined to the ambient request id', async () => {
    const bus = getDevtoolsBus();
    bus.arm();
    bus.emit({ type: 'request:start', requestId: 'req-1', kind: 'graphql', name: 'op', at: Date.now() });
    const intercept = createGraphqlRequestInterceptor(bus);

    const result = await RequestContext.run(
      { requestId: 'req-1', startedAt: Date.now(), kind: 'graphql', name: 'op' },
      async () => {
        const users = await intercept(ctxFor('Query', 'users'), handler(() => ['a']));
        await intercept(ctxFor('Query', 'posts'), handler(() => ['b']));
        return users;
      },
    );

    // Interceptor is transparent — the resolver's value passes through.
    expect(result).toEqual(['a']);

    const detail = bus.getRequest('req-1')!;
    const tokens = detail.steps.map((s) => `${s.token}:${s.outcome}`);
    expect(tokens).toContain('Query.users:pass');
    expect(tokens).toContain('Query.posts:pass');
    expect(detail.steps.every((s) => s.step === 'handler')).toBe(true);
  });

  it('records a resolver throw as both a throwing step and an exception', async () => {
    const bus = getDevtoolsBus();
    bus.arm();
    bus.emit({ type: 'request:start', requestId: 'req-2', kind: 'graphql', name: 'op', at: Date.now() });
    const intercept = createGraphqlRequestInterceptor(bus);

    await RequestContext.run(
      { requestId: 'req-2', startedAt: Date.now(), kind: 'graphql', name: 'op' },
      async () => {
        await expect(
          intercept(
            ctxFor('Query', 'boom'),
            handler(() => {
              throw new Error('resolver failed');
            }),
          ),
        ).rejects.toThrow('resolver failed');
      },
    );

    const detail = bus.getRequest('req-2')!;
    expect(detail.steps.some((s) => s.token === 'Query.boom' && s.outcome === 'throw')).toBe(true);
    expect(
      detail.exceptions.some((e) => e.message === 'resolver failed' && e.handledBy === 'Query.boom'),
    ).toBe(true);
  });
});
