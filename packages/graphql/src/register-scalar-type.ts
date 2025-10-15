import type { GraphQLScalarType } from 'graphql';
import { GraphqlMetadataStorage } from './internal/metadata';

export interface RegisterScalarTypeOptions {
  name?: string;
  description?: string;
  overwrite?: boolean;
}

const normalizeScalar = (
  scalar: GraphQLScalarType,
  options?: RegisterScalarTypeOptions,
): { name: string; description?: string } => {
  const name = options?.name?.trim() || scalar.name?.trim();
  if (!name) {
    throw new Error('registerScalarType requires a scalar with a name or an explicit name option.');
  }

  return {
    name,
    description: options?.description ?? scalar.description ?? undefined,
  };
};

export const registerScalarType = (
  scalar: GraphQLScalarType,
  options?: RegisterScalarTypeOptions,
): void => {
  if (!scalar || typeof scalar !== 'object') {
    throw new Error('registerScalarType expects a GraphQLScalarType instance.');
  }

  if (typeof scalar.serialize !== 'function') {
    throw new Error('registerScalarType expects a scalar with a serialize function.');
  }

  const { name, description } = normalizeScalar(scalar, options);
  const storage = GraphqlMetadataStorage.get();
  storage.addScalarType(
    {
      name,
      description,
      scalar,
    },
    { overwrite: options?.overwrite },
  );
};
