import { describe, it, beforeEach, expect } from 'bun:test';
import { GraphqlSchemaBuilder } from '../src/schema-builder';
import { GraphqlMetadataStorage } from '../src/internal/metadata';
import { ObjectType, InputType } from '../src/decorators/object-type';
import { Field } from '../src/decorators/field';

beforeEach(() => {
  GraphqlMetadataStorage.get().clear();
});

describe('ObjectType and InputType options', () => {
  it('omits abstract object types from the generated schema', () => {
    @ObjectType({ isAbstract: true })
    class AbstractBase {
      @Field()
      baseField!: string;
    }

    @ObjectType()
    class ConcreteType {
      @Field()
      concreteField!: string;
    }

    const builder = new GraphqlSchemaBuilder();
    const artifacts = builder.build([]);

    expect(artifacts.typeDefs).toContain('type ConcreteType');
    expect(artifacts.typeDefs).not.toContain('type AbstractBase');
  });

  it('omits abstract input types from the generated schema', () => {
    @InputType({ isAbstract: true })
    class AbstractInput {
      @Field()
      hiddenField!: string;
    }

    @InputType()
    class ConcreteInput {
      @Field()
      visibleField!: string;
    }

    const builder = new GraphqlSchemaBuilder();
    const artifacts = builder.build([]);

    expect(artifacts.typeDefs).toContain('input ConcreteInput');
    expect(artifacts.typeDefs).not.toContain('input AbstractInput');
  });
});
