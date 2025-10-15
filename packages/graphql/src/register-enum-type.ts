import { GraphqlMetadataStorage, type EnumValueDefinition } from './internal/metadata';

export interface RegisterEnumTypeValueOptions {
  description?: string;
  deprecationReason?: string;
  value?: string | number;
}

export interface RegisterEnumTypeOptions {
  name: string;
  description?: string;
  valuesMap?: Record<string, RegisterEnumTypeValueOptions>;
}

const isNumericKey = (key: string): boolean => {
  if (!key) {
    return false;
  }
  return !Number.isNaN(Number(key));
};

const normalizeEnumValues = (
  enumRef: Record<string, unknown>,
  options?: RegisterEnumTypeOptions['valuesMap'],
): EnumValueDefinition[] => {
  const values: EnumValueDefinition[] = [];

  for (const key of Object.keys(enumRef)) {
    if (isNumericKey(key)) {
      continue;
    }

    const metadata = options?.[key];
    const rawValue = metadata?.value ?? enumRef[key];

    if (rawValue === undefined) {
      continue;
    }

    if (typeof rawValue !== 'string' && typeof rawValue !== 'number') {
      throw new Error('Enum values must be string or number.');
    }

    values.push({
      name: key,
      description: metadata?.description,
      deprecationReason: metadata?.deprecationReason,
      value: rawValue,
    });
  }

  if (!values.length) {
    throw new Error('registerEnumType requires an enum with at least one value.');
  }

  return values;
};

export const registerEnumType = (
  enumRef: Record<string, unknown>,
  options: RegisterEnumTypeOptions,
): void => {
  if (!enumRef || typeof enumRef !== 'object') {
    throw new Error('registerEnumType expects an enum object.');
  }

  if (!options?.name || typeof options.name !== 'string') {
    throw new Error('registerEnumType requires a "name" option.');
  }

  const trimmedName = options.name.trim();
  if (!trimmedName) {
    throw new Error('registerEnumType requires a non-empty name.');
  }

  const values = normalizeEnumValues(enumRef, options.valuesMap);

  const storage = GraphqlMetadataStorage.get();
  storage.addEnumType(enumRef, {
    name: trimmedName,
    description: options.description,
    values,
  });
};
