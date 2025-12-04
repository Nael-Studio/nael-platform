import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import type { Token } from '@nl-framework/core';
import { UseInterceptors } from '@nl-framework/http';
import { GraphqlSchemaBuilder } from '../src/schema-builder';
import { GraphqlMetadataStorage } from '../src/internal/metadata';
import { ObjectType } from '../src/decorators/object-type';
import { Field } from '../src/decorators/field';
import { Resolver, Query } from '../src/decorators/resolver';
import {
  registerGraphqlInterceptor,
  clearGraphqlInterceptors,
} from '../src/interceptors/registry';
import type {
  GraphqlCallHandler,
  GraphqlInterceptor,
  GraphqlInterceptorFunction,
} from '../src/interceptors/types';

const invocationOrder: string[] = [];
let cachedHandlerRuns = 0;

interface ReportPayload {
  message: string;
}

class EnvelopeInterceptor implements GraphqlInterceptor {
  async intercept(_context: unknown, next: GraphqlCallHandler) {
    invocationOrder.push('resolver-before');
    const result = await next.handle();
    invocationOrder.push('resolver-after');
    return { data: result };
  }
}

const cacheInterceptor: GraphqlInterceptorFunction = async () => {
  cachedHandlerRuns += 1;
  return { data: { message: 'cached' } };
};

const methodTraceInterceptor: GraphqlInterceptorFunction = async (_ctx, next) => {
  invocationOrder.push('method-before');
  const result = await next.handle();
  invocationOrder.push('method-after');
  return result;
};

const globalTraceInterceptor: GraphqlInterceptorFunction = async (_ctx, next) => {
  invocationOrder.push('global-before');
  const result = await next.handle();
  invocationOrder.push('global-after');
  return result;
};

class PrefixService {
  prefix = 'GraphQL';
}

class InjectedInterceptor implements GraphqlInterceptor {
  constructor(private readonly svc: PrefixService) { }

  async intercept(_ctx: unknown, next: GraphqlCallHandler) {
    const result = (await next.handle()) as ReportPayload;
    return { data: `${this.svc.prefix}:${result.message}` };
  }
}

function createResolvers() {
  @ObjectType()
  class Report {
    @Field()
    message!: string;
  }

  @Resolver(() => Report)
  @UseInterceptors(EnvelopeInterceptor)
  class ReportResolver {
    @Query(() => Report)
    stats() {
      invocationOrder.push('handler');
      return { message: 'report' } as ReportPayload;
    }

    @UseInterceptors(cacheInterceptor)
    @Query(() => Report)
    cachedStats() {
      invocationOrder.push('cached-handler');
      return { message: 'unreachable' } as ReportPayload;
    }

    @UseInterceptors(methodTraceInterceptor)
    @Query(() => Report)
    tracedStats() {
      invocationOrder.push('handler');
      return { message: 'trace' } as ReportPayload;
    }
  }

  @Resolver(() => Report)
  @UseInterceptors(InjectedInterceptor)
  class InjectedResolver {
    @Query(() => Report)
    info() {
      return { message: 'resolver' } as ReportPayload;
    }
  }

  return { ReportResolver, InjectedResolver };
}

beforeEach(() => {
  GraphqlMetadataStorage.get().clear();
  clearGraphqlInterceptors();
  invocationOrder.length = 0;
  cachedHandlerRuns = 0;
});

afterEach(() => {
  clearGraphqlInterceptors();
});

describe('GraphQL interceptors', () => {
  it('wraps resolver execution with controller and method interceptors', async () => {
    const { ReportResolver } = createResolvers();
    const builder = new GraphqlSchemaBuilder();
    const artifacts = builder.build([new ReportResolver()]);
    const query = artifacts.resolvers.Query;

    const result = await query.stats({}, {}, {});
    expect(result).toEqual({ data: { message: 'report' } });
    expect(invocationOrder).toEqual(['resolver-before', 'handler', 'resolver-after']);

    const cached = await query.cachedStats({}, {}, {});
    expect(cached).toEqual({ data: { data: { message: 'cached' } } });
    expect(cachedHandlerRuns).toBe(1);

    invocationOrder.length = 0;
    const traced = await query.tracedStats({}, {}, {});
    expect(traced).toEqual({ data: { message: 'trace' } });
    expect(invocationOrder).toEqual([
      'resolver-before',
      'method-before',
      'handler',
      'method-after',
      'resolver-after',
    ]);
  });

  it('runs global interceptors ahead of resolver-scoped interceptors', async () => {
    registerGraphqlInterceptor(globalTraceInterceptor);
    const { ReportResolver } = createResolvers();
    const builder = new GraphqlSchemaBuilder();
    const artifacts = builder.build([new ReportResolver()]);
    const query = artifacts.resolvers.Query;

    invocationOrder.length = 0;
    const traced = await query.tracedStats({}, {}, {});
    expect(traced).toEqual({ data: { message: 'trace' } });
    expect(invocationOrder).toEqual([
      'global-before',
      'resolver-before',
      'method-before',
      'handler',
      'method-after',
      'resolver-after',
      'global-after',
    ]);
  });

  it('resolves class-based interceptors through the runtime options', async () => {
    const resolvedTokens: Token<unknown>[] = [];
    const { InjectedResolver } = createResolvers();
    const builder = new GraphqlSchemaBuilder();
    const artifacts = builder.build([new InjectedResolver()], {
      interceptors: {
        resolve: async <T>(token: Token<T>) => {
          resolvedTokens.push(token as Token<unknown>);
          if (token === InjectedInterceptor) {
            return new InjectedInterceptor(new PrefixService()) as T;
          }
          if (token === PrefixService) {
            return new PrefixService() as T;
          }
          throw new Error('Unknown token');
        },
      },
    });

    const query = artifacts.resolvers.Query;
    const result = await query.info({}, {}, {});
    expect(result).toEqual({ data: 'GraphQL:resolver' });
    expect(resolvedTokens).toContain(InjectedInterceptor);
  });
});
