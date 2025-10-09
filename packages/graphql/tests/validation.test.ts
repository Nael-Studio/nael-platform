import { describe, it, expect, beforeEach } from 'bun:test';
import { GraphQLError } from 'graphql';
import { GraphqlSchemaBuilder } from '../src/schema-builder';
import { GraphqlMetadataStorage } from '../src/internal/metadata';
import { InputType, ObjectType } from '../src/decorators/object-type';
import { Field } from '../src/decorators/field';
import { Resolver, Mutation, Arg } from '../src/decorators/resolver';
import { Int } from '../src/scalars';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

beforeEach(() => {
  GraphqlMetadataStorage.get().clear();
});

describe('GraphQL argument validation', () => {
  it('transforms and validates input arguments before invoking the resolver', async () => {
    @InputType()
    class CreateMessageInput {
      @Field()
      @IsString()
      message!: string;

      @Field(() => Int, { nullable: true })
      @IsOptional()
      @IsInt()
      @Min(0)
      @Type(() => Number)
      count?: number;
    }

    @ObjectType()
    class Message {
      @Field()
      message!: string;

      @Field(() => Int, { nullable: true })
      count?: number | null;
    }

    @Resolver()
    class MessageResolver {
      public lastInput: CreateMessageInput | undefined;

      @Mutation(() => Message)
      createMessage(@Arg('input', () => CreateMessageInput) input: CreateMessageInput): Message {
        this.lastInput = input;
        return {
          message: input.message,
          count: input.count ?? null,
        } satisfies Message;
      }
    }

    const resolverInstance = new MessageResolver();
    const builder = new GraphqlSchemaBuilder();
    const artifacts = builder.build([resolverInstance]);
    const mutation = artifacts.resolvers.Mutation.createMessage;

    const result = await mutation(
      {},
      { input: { message: 'validated', count: '5', extraneous: 'nope' } },
      {},
      {},
    );

    expect(result).toEqual({ message: 'validated', count: 5 });
    expect(resolverInstance.lastInput).toBeInstanceOf(CreateMessageInput);
    expect(resolverInstance.lastInput?.count).toBe(5);
    expect('extraneous' in (resolverInstance.lastInput as CreateMessageInput)).toBe(false);
  });

  it('throws a GraphQL error with validation details for invalid input', async () => {
    @InputType()
    class RegisterInput {
      @Field()
      @IsString()
      username!: string;
    }

    @ObjectType()
    class RegisterResult {
      @Field()
      username!: string;
    }

    @Resolver()
    class RegisterResolver {
      @Mutation(() => RegisterResult)
      register(@Arg('input', () => RegisterInput) input: RegisterInput): RegisterResult {
        return { username: input.username } satisfies RegisterResult;
      }
    }

    const resolverInstance = new RegisterResolver();
    const builder = new GraphqlSchemaBuilder();
    const artifacts = builder.build([resolverInstance]);
    const mutation = artifacts.resolvers.Mutation.register;

    try {
      await mutation({}, { input: {} }, {}, {});
      throw new Error('Expected mutation to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(GraphQLError);
      const graphQLError = error as GraphQLError;
      expect(graphQLError.extensions?.code).toBe('BAD_USER_INPUT');
      expect(graphQLError.extensions?.validation).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ property: 'username' }),
        ]),
      );
    }
  });
});
