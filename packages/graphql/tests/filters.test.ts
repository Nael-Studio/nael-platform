import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { GraphQLError } from 'graphql';
import { UseFilters } from '@nl-framework/http';
import { GraphqlSchemaBuilder, type GraphqlFilterRuntimeOptions } from '../src/schema-builder';
import { GraphqlMetadataStorage } from '../src/internal/metadata';
import { ObjectType } from '../src/decorators/object-type';
import { Field } from '../src/decorators/field';
import { Resolver, Query } from '../src/decorators/resolver';
import {
  registerGraphQLExceptionFilter,
  clearGraphQLExceptionFilters,
} from '../src/filters/registry';
import type { GraphQLExceptionFilter } from '../src/filters/graphql-exception-filter.interface';
import type { Token } from '@nl-framework/core';

class ScopedError extends Error {}
class ControllerError extends Error {}

class ScopedFilter implements GraphQLExceptionFilter {
  catch(exception: Error) {
    if (exception instanceof ScopedError) {
      return new GraphQLError('scoped-filter');
    }
    throw exception;
  }
}

const controllerFilter: GraphQLExceptionFilter = {
  catch(exception: Error) {
    if (exception instanceof ControllerError) {
      return new GraphQLError('controller-filter');
    }
    throw exception;
  },
};

class PrefixService {
  constructor(public readonly prefix = 'GraphQL') {}
}

class InjectableFilter implements GraphQLExceptionFilter {
  constructor(private readonly service: PrefixService) {}

  catch(exception: Error) {
    if (exception instanceof ScopedError) {
      return new GraphQLError(`${this.service.prefix}:${exception.message}`);
    }
    throw exception;
  }
}

function createResolvers() {
  @ObjectType()
  class Report {
    @Field()
    message!: string;
  }

  @Resolver(() => Report)
  @UseFilters(controllerFilter)
  class FilteredResolver {
    @UseFilters(ScopedFilter)
    @Query(() => Report)
    scoped() {
      throw new ScopedError('boom');
    }

    @Query(() => Report)
    controllerLevel() {
      throw new ControllerError('zap');
    }

    @UseFilters(InjectableFilter)
    @Query(() => Report)
    injectable() {
      throw new ScopedError('runtime');
    }
  }

  return { FilteredResolver };
}

beforeEach(() => {
  GraphqlMetadataStorage.get().clear();
  clearGraphQLExceptionFilters();
});

afterEach(() => {
  clearGraphQLExceptionFilters();
});

describe('GraphQL exception filters', () => {
  it('runs method-level filters before controller filters', async () => {
    const { FilteredResolver } = createResolvers();
    const builder = new GraphqlSchemaBuilder();
    const artifacts = builder.build([new FilteredResolver()]);
    const query = artifacts.resolvers.Query;

    await expect(query.scoped({}, {}, {})).rejects.toThrow('scoped-filter');
  });

  it('executes controller filters when no method filter is registered', async () => {
    const { FilteredResolver } = createResolvers();
    const builder = new GraphqlSchemaBuilder();
    const artifacts = builder.build([new FilteredResolver()]);
    const query = artifacts.resolvers.Query;

    await expect(query.controllerLevel({}, {}, {})).rejects.toThrow('controller-filter');
  });

  it('resolves filter classes through the runtime options', async () => {
    const resolvedTokens: unknown[] = [];
    const { FilteredResolver } = createResolvers();
    const builder = new GraphqlSchemaBuilder();
    const artifacts = builder.build([new FilteredResolver()], {
      filters: {
        resolve: async <T>(token: Token<T>) => {
          resolvedTokens.push(token);
          if (token === InjectableFilter) {
            return new InjectableFilter(new PrefixService()) as T;
          }
          if (token === PrefixService) {
            return new PrefixService() as T;
          }
          throw new Error('Unknown token');
        },
      } satisfies GraphqlFilterRuntimeOptions,
    });

    const query = artifacts.resolvers.Query;
    await expect(query.injectable({}, {}, {})).rejects.toThrow('GraphQL:runtime');
    expect(resolvedTokens).toContain(InjectableFilter);
  });

  it('executes registered global filters ahead of scoped filters', async () => {
    registerGraphQLExceptionFilter({
      catch: () => new GraphQLError('global-filter'),
    });
    const { FilteredResolver } = createResolvers();
    const builder = new GraphqlSchemaBuilder();
    const artifacts = builder.build([new FilteredResolver()]);
    const query = artifacts.resolvers.Query;

    await expect(query.scoped({}, {}, {})).rejects.toThrow('global-filter');
  });
});
