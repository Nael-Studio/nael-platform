/// <reference path="../class-transformer-storage.d.ts" />
import 'reflect-metadata';
import { getMetadataStorage } from 'class-validator';
import { defaultMetadataStorage } from 'class-transformer/cjs/storage';
import type { ClassType } from '@nl-framework/core';
import type { JsonSchema } from '../interfaces';

/** Accumulates named component schemas while walking (potentially cyclic) DTOs. */
export interface SchemaRegistry {
  schemas: Record<string, JsonSchema>;
}

export const createSchemaRegistry = (): SchemaRegistry => ({ schemas: {} });

export const refFor = (name: string): JsonSchema => ({
  $ref: `#/components/schemas/${name}`,
});

const PRIMITIVE_CONSTRUCTORS = new Set<unknown>([
  String,
  Number,
  Boolean,
  Array,
  Object,
  Date,
  Promise,
  Symbol,
  BigInt,
]);

const isDtoClass = (value: unknown): value is ClassType =>
  typeof value === 'function' && !PRIMITIVE_CONSTRUCTORS.has(value);

/** Base JSON Schema for a reflected `design:type` constructor. */
const schemaForDesignType = (designType: unknown): JsonSchema => {
  switch (designType) {
    case String:
      return { type: 'string' };
    case Number:
      return { type: 'number' };
    case Boolean:
      return { type: 'boolean' };
    case Date:
      return { type: 'string', format: 'date-time' };
    case Array:
      return { type: 'array', items: {} };
    default:
      return {};
  }
};

const enumType = (values: unknown[]): string | undefined => {
  if (!values.length) {
    return undefined;
  }
  if (values.every((v) => typeof v === 'number')) {
    return 'number';
  }
  if (values.every((v) => typeof v === 'string')) {
    return 'string';
  }
  return undefined;
};

/**
 * Apply a single class-validator metadata entry to a scalar (item-level) schema.
 * Structural array wrapping (`each: true`) is handled by the caller.
 */
const applyValidator = (
  schema: JsonSchema,
  type: string,
  constraints: unknown[],
): void => {
  switch (type) {
    case 'isString':
      schema.type = 'string';
      break;
    case 'isInt':
      schema.type = 'integer';
      break;
    case 'isNumber':
      schema.type = 'number';
      break;
    case 'isBoolean':
      schema.type = 'boolean';
      break;
    case 'isDate':
      schema.type = 'string';
      schema.format = 'date-time';
      break;
    case 'isArray':
      schema.type = 'array';
      if (!schema.items) {
        schema.items = {};
      }
      break;
    case 'isEmail':
      schema.type = 'string';
      schema.format = 'email';
      break;
    case 'isUuid':
      schema.type = 'string';
      schema.format = 'uuid';
      break;
    case 'isMongoId':
      schema.type = 'string';
      break;
    case 'isEnum': {
      const values = Array.isArray(constraints[1]) ? (constraints[1] as unknown[]) : [];
      if (values.length) {
        schema.enum = values;
        const inferred = enumType(values);
        if (inferred) {
          schema.type = inferred;
        }
      }
      break;
    }
    case 'min':
      if (typeof constraints[0] === 'number') {
        schema.minimum = constraints[0] as number;
      }
      break;
    case 'max':
      if (typeof constraints[0] === 'number') {
        schema.maximum = constraints[0] as number;
      }
      break;
    case 'isPositive':
      schema.type = schema.type ?? 'number';
      schema.exclusiveMinimum = 0;
      break;
    case 'isNegative':
      schema.type = schema.type ?? 'number';
      schema.exclusiveMaximum = 0;
      break;
    case 'isLength':
      if (typeof constraints[0] === 'number') {
        schema.minLength = constraints[0] as number;
      }
      if (typeof constraints[1] === 'number') {
        schema.maxLength = constraints[1] as number;
      }
      break;
    case 'maxLength':
      if (typeof constraints[0] === 'number') {
        schema.maxLength = constraints[0] as number;
      }
      break;
    case 'minLength':
      if (typeof constraints[0] === 'number') {
        schema.minLength = constraints[0] as number;
      }
      break;
    case 'matches': {
      const pattern = constraints[0];
      if (pattern instanceof RegExp) {
        schema.pattern = pattern.source;
      } else if (typeof pattern === 'string') {
        schema.pattern = pattern;
      }
      break;
    }
    default:
      break;
  }
};

interface PropertyMeta {
  type: string;
  constraints: unknown[];
  each: boolean;
}

/** Resolve the element class of a nested array via class-transformer's `@Type`. */
const resolveArrayItemClass = (dtoClass: ClassType, property: string): ClassType | undefined => {
  try {
    const meta = defaultMetadataStorage.findTypeMetadata(dtoClass, property);
    const resolved = meta?.typeFunction?.();
    return isDtoClass(resolved) ? resolved : undefined;
  } catch {
    return undefined;
  }
};

const buildScalarSchema = (
  dtoClass: ClassType,
  property: string,
  designType: unknown,
  metas: PropertyMeta[],
  registry: SchemaRegistry,
): JsonSchema => {
  const isEach = metas.some((m) => m.each);
  const nested = metas.find((m) => m.type === 'nestedValidation');

  if (nested) {
    // Nested object/array of DTOs → $ref (registered cycle-safely).
    const itemClass = isEach
      ? resolveArrayItemClass(dtoClass, property)
      : isDtoClass(designType)
        ? designType
        : undefined;
    if (itemClass) {
      return refFor(registerDtoSchema(itemClass, registry));
    }
    return {};
  }

  if (!isEach && isDtoClass(designType) && designType !== Array) {
    // Property typed as another class without @ValidateNested — still worth a $ref.
    return refFor(registerDtoSchema(designType, registry));
  }

  // For `each` validators the constraints describe array *items*, so seed from
  // an empty schema; the caller wraps the result in an array. Otherwise seed
  // from the reflected design type.
  const schema = isEach ? {} : schemaForDesignType(designType);
  const constraining = new Set([
    'isString',
    'isInt',
    'isNumber',
    'isBoolean',
    'isDate',
    'isArray',
    'isEmail',
    'isUuid',
    'isMongoId',
    'isEnum',
  ]);
  const hasTypeInfo =
    designType !== undefined && designType !== Object
      ? true
      : metas.some((m) => constraining.has(m.type));

  for (const meta of metas) {
    applyValidator(schema, meta.type, meta.constraints);
  }

  if (!hasTypeInfo && !schema.type && !schema.enum) {
    schema.description = 'unvalidated';
  }

  return schema;
};

/**
 * Walk `class-validator` + `design:type` metadata for `dtoClass` into a JSON
 * Schema object. Nested DTOs are registered into `registry.schemas` and
 * referenced with `$ref`; the class is registered before recursion so cycles
 * terminate.
 */
export const classToJsonSchema = (
  dtoClass: ClassType,
  registry: SchemaRegistry = createSchemaRegistry(),
): JsonSchema => {
  const storage = getMetadataStorage();
  const rawMetadatas = storage.getTargetValidationMetadatas(dtoClass, '', false, false);
  const grouped = storage.groupByPropertyName(rawMetadatas);

  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const property of Object.keys(grouped)) {
    const entries = grouped[property] ?? [];
    const metas: PropertyMeta[] = entries.map((entry) => ({
      // `ValidateBy` validators (@IsString, @Min, …) all store their real name
      // under `name` with `type === 'customValidation'`. The structural
      // validators (@ValidateNested, @IsOptional) use `type` directly.
      type: entry.type === 'customValidation' ? (entry.name ?? '') : entry.type,
      constraints: entry.constraints ?? [],
      each: Boolean(entry.each),
    }));

    const optional = metas.some((m) => m.type === 'conditionalValidation');
    const designType = Reflect.getMetadata('design:type', dtoClass.prototype, property);

    let schema = buildScalarSchema(dtoClass, property, designType, metas, registry);

    // Wrap in an array when validators declared `each: true` but the base type
    // wasn't already an array (e.g. `@IsString({ each: true })` or a nested
    // array of DTOs referenced by `$ref`).
    const isEach = metas.some((m) => m.each);
    if (isEach && schema.type !== 'array') {
      schema = { type: 'array', items: schema };
    }

    properties[property] = schema;
    if (!optional) {
      required.push(property);
    }
  }

  const result: JsonSchema = {
    type: 'object',
    properties,
  };
  if (required.length) {
    result.required = required;
  }
  return result;
};

/**
 * Register `dtoClass` (and any nested DTOs) into `registry.schemas`, returning
 * the component name. Idempotent and cycle-safe: a placeholder is written
 * before recursion so mutually-referential DTOs terminate.
 */
export const registerDtoSchema = (dtoClass: ClassType, registry: SchemaRegistry): string => {
  const name = dtoClass.name;
  if (registry.schemas[name]) {
    return name;
  }
  registry.schemas[name] = { type: 'object' };
  registry.schemas[name] = classToJsonSchema(dtoClass, registry);
  return name;
};
