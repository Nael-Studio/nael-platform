import { beforeEach, describe, expect, it } from 'bun:test';
import { GraphqlSchemaBuilder } from '../src/schema-builder';
import { GraphqlMetadataStorage } from '../src/internal/metadata';
import { registerScalarType } from '../src/register-scalar-type';
import { GraphQLDateTime, DateTime } from '../src/scalars';
import { ObjectType } from '../src/decorators/object-type';
import { Field } from '../src/decorators/field';
import { Resolver, Query } from '../src/decorators/resolver';

beforeEach(() => {
  const storage = GraphqlMetadataStorage.get();
  storage.clear();
  registerScalarType(GraphQLDateTime);
});

describe('DateTime Scalar', () => {
  it('automatically uses DateTime scalar for Date properties', () => {
    @ObjectType()
    class User {
      @Field(() => Date)
      createdAt!: Date;
    }

    @Resolver(() => User)
    class UserResolver {
      @Query(() => User)
      me(): User {
        return { createdAt: new Date() } satisfies User;
      }
    }

    const builder = new GraphqlSchemaBuilder();
    const artifacts = builder.build([new UserResolver()]);

    expect(artifacts.typeDefs).toContain('scalar DateTime');
    expect(artifacts.typeDefs).toContain('createdAt: DateTime!');
    expect(artifacts.resolvers.DateTime).toBe(GraphQLDateTime);
  });

  it('supports explicit DateTime token', () => {
    @ObjectType()
    class Event {
      @Field(() => DateTime)
      timestamp!: Date;
    }

    @Resolver(() => Event)
    class EventResolver {
      @Query(() => Event)
      event(): Event {
        return { timestamp: new Date() } satisfies Event;
      }
    }

    const builder = new GraphqlSchemaBuilder();
    const artifacts = builder.build([new EventResolver()]);

    expect(artifacts.typeDefs).toContain('scalar DateTime');
    expect(artifacts.typeDefs).toContain('timestamp: DateTime!');
    expect(artifacts.resolvers.DateTime).toBe(GraphQLDateTime);
  });
});
