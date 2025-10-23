import type { ClassType } from '@nl-framework/core';
import { GraphQLScalarType } from 'graphql';
import { GraphqlMetadataStorage, type TypeThunk } from './metadata';
import { ScalarToken, type ScalarResolvable, DateTime, ID, Int, Float, BooleanScalar, StringScalar } from '../scalars';

export interface TypeResolution {
  typeName: string;
  isList: boolean;
  target?: ClassType;
  isEnum?: boolean;
}

const storage = GraphqlMetadataStorage.get();

const resolveScalarName = (value: ScalarResolvable | ScalarToken): string => {
  if (value instanceof ScalarToken) {
    return value.name;
  }

  if (value instanceof GraphQLScalarType) {
    return value.name;
  }

  if (typeof value === 'object' && value !== null && 'name' in value) {
    const name = (value as { name?: unknown }).name;
    if (typeof name === 'string') {
      return name;
    }
  }

  switch (value) {
    case String:
      return 'String';
    case Number:
      return 'Float';
    case Boolean:
      return 'Boolean';
    case Date:
      return DateTime.name;
    default:
      throw new Error(`Unsupported scalar type: ${value}`);
  }
};

const resolveClassName = (value: ClassType): string => {
  // Map bare JavaScript Object to JSON scalar. This happens when a field is
  // declared with a broad TS type like `object`, `Record<string, unknown>`,
  // `unknown`, or `any` without an explicit type thunk. Reflect metadata emits
  // `Object` in these cases, which is not a valid GraphQL type. We normalize it
  // to our registered JSON scalar instead.
  if (value === Object) {
    return 'JSON';
  }

  if (value === String) {
    return 'String';
  }

  if (value === Number) {
    return 'Float';
  }

  if (value === Boolean) {
    return 'Boolean';
  }

  if (value === Date) {
    return 'String';
  }

  const objectType = storage.getObjectTypeDefinition(value);
  if (objectType) {
    return objectType.name ?? value.name;
  }

  const inputType = storage.getInputTypeDefinition(value);
  if (inputType) {
    return inputType.name ?? value.name;
  }

  if (value.name) {
    return value.name;
  }

  throw new Error('Unable to determine GraphQL type name from class reference');
};

const normalize = (raw: unknown): TypeResolution => {
  if (raw === undefined || raw === null) {
    throw new Error('Cannot resolve GraphQL type from undefined value');
  }

  if (Array.isArray(raw)) {
    if (raw.length !== 1) {
      throw new Error('List type functions must return a single-element array e.g. () => [Type]');
    }

    const inner = normalize(raw[0]);
    return {
      ...inner,
      isList: true,
    };
  }

  if (raw instanceof ScalarToken) {
    return {
      typeName: raw.name,
      isList: false,
    };
  }

  if (raw === ID) {
    return { typeName: 'ID', isList: false };
  }

  if (raw === Int) {
    return { typeName: 'Int', isList: false };
  }

  if (raw === Float) {
    return { typeName: 'Float', isList: false };
  }

  if (raw === BooleanScalar) {
    return { typeName: 'Boolean', isList: false };
  }

  if (raw === StringScalar) {
    return { typeName: 'String', isList: false };
  }

  if (raw === DateTime) {
    return { typeName: 'String', isList: false };
  }

  // If reflect metadata reports the bare Object constructor, treat it as the JSON scalar.
  if (raw === Object) {
    return { typeName: 'JSON', isList: false };
  }

  if (typeof raw === 'function') {
    return {
      typeName: resolveClassName(raw as ClassType),
      isList: false,
      target: raw as ClassType,
    };
  }

  if (typeof raw === 'object') {
    if (raw === null) {
      throw new Error('Unsupported GraphQL type reference: null');
    }

    const enumDefinition = storage.getEnumTypeByRef(raw as object);
    if (enumDefinition) {
      return {
        typeName: enumDefinition.name,
        isList: false,
        isEnum: true,
      };
    }

    if (raw === null || typeof (raw as { name?: unknown }).name !== 'string') {
      throw new Error(
        'Unsupported GraphQL type reference. If this is an enum, call registerEnumType() first.',
      );
    }

    const candidate = raw as ScalarResolvable | ScalarToken;

    return {
      typeName: resolveScalarName(candidate),
      isList: false,
    };
  }

  throw new Error(`Unsupported GraphQL type reference: ${String(raw)}`);
};

export const resolveTypeReference = (typeThunk?: TypeThunk, designType?: unknown): TypeResolution => {
  if (typeThunk) {
    return normalize(typeThunk());
  }

  if (!designType) {
    throw new Error('Unable to resolve type. Provide an explicit type function in the decorator.');
  }

  if (designType === Promise) {
    throw new Error('Decorator return type resolved to Promise. Provide an explicit type function.');
  }

  if (designType === Array) {
    throw new Error('Decorator return type resolved to Array. Provide an explicit list type e.g. () => [Type].');
  }

  return normalize(designType);
};

export const renderGraphqlType = (
  resolution: TypeResolution,
  options: { nullable?: boolean; list?: boolean },
): string => {
  const isList = options.list ?? resolution.isList;
  const enforceNonNull = !options.nullable;

  if (isList) {
    const inner = `${resolution.typeName}!`;
    return enforceNonNull ? `[${inner}]!` : `[${inner}]`;
  }

  return enforceNonNull ? `${resolution.typeName}!` : resolution.typeName;
};
