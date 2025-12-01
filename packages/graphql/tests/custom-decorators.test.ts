import { describe, it, expect, beforeEach } from 'bun:test';
import { GraphqlSchemaBuilder } from '../src/schema-builder';
import { GraphqlMetadataStorage } from '../src/internal/metadata';
import { ObjectType } from '../src/decorators/object-type';
import { Field } from '../src/decorators/field';
import { Resolver, Query, createGraphqlParamDecorator } from '../src/decorators/resolver';

const CurrentTenant = createGraphqlParamDecorator<string | undefined>((property, ctx) => {
  const tenant = (ctx.context?.tenant ?? {}) as Record<string, unknown>;
  if (!property) {
    return tenant;
  }
  return tenant[property];
});

const createTenantResolvers = () => {
  @ObjectType()
  class TenantInfo {
    @Field()
    id!: string;

    @Field()
    plan!: string;
  }

  @Resolver(() => TenantInfo)
  class TenantResolver {
    @Query(() => TenantInfo)
    info(
      @CurrentTenant('id') tenantId: string,
      @CurrentTenant() tenant: Record<string, unknown>,
    ) {
      return { id: tenantId, plan: String(tenant.plan ?? 'free') } as TenantInfo;
    }
  }

  return { TenantResolver };
};

beforeEach(() => {
  GraphqlMetadataStorage.get().clear();
});

describe('GraphQL custom parameter decorators', () => {
  it('injects values resolved from the GraphQL context', async () => {
    const { TenantResolver } = createTenantResolvers();
    const builder = new GraphqlSchemaBuilder();
    const artifacts = builder.build([new TenantResolver()]);
    const query = artifacts.resolvers.Query;

    const result = await query.info({}, {}, { tenant: { id: 'acme', plan: 'pro' } }, {});
    expect(result).toEqual({ id: 'acme', plan: 'pro' });
  });
});
