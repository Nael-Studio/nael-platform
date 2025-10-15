import { beforeEach, describe, expect, it } from 'bun:test';
import { GraphQLScalarType, Kind } from 'graphql';
import { GraphqlSchemaBuilder } from '../src/schema-builder';
import { GraphqlMetadataStorage } from '../src/internal/metadata';
import { registerScalarType } from '../src/register-scalar-type';
import { GraphQLJSON, JSONScalar, ScalarToken } from '../src/scalars';
import { ObjectType } from '../src/decorators/object-type';
import { Field } from '../src/decorators/field';
import { Resolver, Query } from '../src/decorators/resolver';

beforeEach(() => {
  const storage = GraphqlMetadataStorage.get();
  storage.clear();
  registerScalarType(GraphQLJSON);
});

describe('registerScalarType', () => {
  it('provides JSON scalar resolver and SDL when using GraphQLJSON', () => {
    @ObjectType()
    class DocumentWrapper {
      @Field(() => GraphQLJSON)
      payload!: Record<string, unknown>;
    }

    @Resolver(() => DocumentWrapper)
    class DocumentResolver {
      @Query(() => DocumentWrapper)
      document(): DocumentWrapper {
        return { payload: { hello: 'world' } } satisfies DocumentWrapper;
      }
    }

    const builder = new GraphqlSchemaBuilder();
    const artifacts = builder.build([new DocumentResolver()]);

    expect(artifacts.typeDefs).toContain('scalar JSON');
    expect(artifacts.resolvers.JSON).toBe(GraphQLJSON);
    expect(typeof artifacts.resolvers.JSON.serialize).toBe('function');
  });

  it('supports registering custom scalars referenced by ScalarToken', () => {
    const DecimalScalar = new GraphQLScalarType({
      name: 'Decimal',
      serialize: (value: unknown) => value,
      parseValue: (value: unknown) => value,
      parseLiteral: (ast) => {
        if (ast.kind === Kind.STRING || ast.kind === Kind.INT || ast.kind === Kind.FLOAT) {
          return ast.value;
        }
        return null;
      },
    });

    registerScalarType(DecimalScalar);

    const Decimal = new ScalarToken('Decimal');

    @ObjectType()
    class Price {
      @Field(() => Decimal)
      amount!: string;
    }

    @Resolver(() => Price)
    class PriceResolver {
      @Query(() => Price)
      price(): Price {
        return { amount: '12.34' } satisfies Price;
      }
    }

    const builder = new GraphqlSchemaBuilder();
    const artifacts = builder.build([new PriceResolver()]);

    expect(artifacts.typeDefs).toContain('scalar Decimal');
    expect(artifacts.resolvers.Decimal).toBe(DecimalScalar);
  });

  it('throws when a custom scalar is used without being registered', () => {
    const Unregistered = new ScalarToken('Unregistered');

    @ObjectType()
    class Sample {
      @Field(() => Unregistered)
      data!: string;
    }

    @Resolver(() => Sample)
    class SampleResolver {
      @Query(() => Sample)
      sample(): Sample {
        return { data: 'test' } satisfies Sample;
      }
    }

    const builder = new GraphqlSchemaBuilder();

    expect(() => builder.build([new SampleResolver()])).toThrow(/registerScalarType/);
  });

  it('allows using the JSON ScalarToken alias', () => {
    @ObjectType()
    class JsonHolder {
      @Field(() => JSONScalar)
      data!: Record<string, unknown>;
    }

    @Resolver(() => JsonHolder)
    class JsonResolver {
      @Query(() => JsonHolder)
      json(): JsonHolder {
        return { data: { nested: [1, 2, 3] } } satisfies JsonHolder;
      }
    }

    const builder = new GraphqlSchemaBuilder();
    const artifacts = builder.build([new JsonResolver()]);

    expect(artifacts.typeDefs).toContain('scalar JSON');
    expect(artifacts.resolvers.JSON).toBe(GraphQLJSON);
  });
});
