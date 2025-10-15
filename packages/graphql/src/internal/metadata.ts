import type { ClassType } from '@nl-framework/core';
import type { GraphQLScalarType } from 'graphql';

export type TypeThunk = () => unknown;

export type GraphqlTypeKind = 'object' | 'input';

export interface FederationObjectOptions {
  keyFields?: string[];
  extend?: boolean;
  shareable?: boolean;
  resolvable?: boolean;
  interfaceObject?: boolean;
  tags?: string[];
}

export interface ObjectTypeOptions {
  name?: string;
  description?: string;
  directives?: string[];
  federation?: FederationObjectOptions;
}

export interface ObjectTypeDefinition extends ObjectTypeOptions {
  target: ClassType;
  kind: GraphqlTypeKind;
}

export interface FieldFederationOptions {
  external?: boolean;
  provides?: string;
  requires?: string;
  shareable?: boolean;
  overrideFrom?: string;
  tags?: string[];
}

export interface FieldOptions {
  name?: string;
  description?: string;
  nullable?: boolean;
  deprecationReason?: string;
  defaultValue?: unknown;
  list?: boolean;
  federation?: FieldFederationOptions;
}

export interface FieldDefinition {
  target: ClassType;
  name: string;
  propertyKey: string | symbol;
  typeThunk?: TypeThunk;
  designType?: unknown;
  options: FieldOptions;
}

export interface EnumValueDefinition {
  name: string;
  description?: string;
  deprecationReason?: string;
  value: string | number;
}

export interface EnumTypeDefinition {
  enumRef: object;
  name: string;
  description?: string;
  values: EnumValueDefinition[];
}

export interface ScalarTypeDefinition {
  name: string;
  description?: string;
  scalar: GraphQLScalarType;
}

export type ResolverKind = 'query' | 'mutation' | 'field';

export interface ResolverMethodOptions {
  name?: string;
  description?: string;
  nullable?: boolean;
  deprecationReason?: string;
  list?: boolean;
}

export interface ResolverMethodDefinition {
  kind: ResolverKind;
  target: ClassType;
  methodName: string;
  schemaName: string;
  typeThunk?: TypeThunk;
  designReturnType?: unknown;
  options: ResolverMethodOptions;
}

export type ResolverParamKind = 'arg' | 'args' | 'context' | 'info' | 'parent';

export interface ResolverParamOptions {
  description?: string;
  nullable?: boolean;
  defaultValue?: unknown;
  list?: boolean;
}

export interface ResolverParamDefinition {
  target: ClassType;
  methodName: string;
  index: number;
  kind: ResolverParamKind;
  name?: string;
  typeThunk?: TypeThunk;
  designType?: unknown;
  options: ResolverParamOptions;
}

export interface ResolverClassDefinition {
  target: ClassType;
  objectTypeThunk?: TypeThunk;
  queries: ResolverMethodDefinition[];
  mutations: ResolverMethodDefinition[];
  fields: ResolverMethodDefinition[];
  resolveReference?: ResolverMethodDefinition;
}

const resolverMethodKey = (target: ClassType, methodName: string | symbol): string =>
  `${target.name}:${String(methodName)}`;

const GLOBAL_GRAPHQL_METADATA_KEY = '__NL_FRAMEWORK_GRAPHQL_METADATA__';

type GraphqlMetadataGlobal = typeof globalThis & {
  [GLOBAL_GRAPHQL_METADATA_KEY]?: GraphqlMetadataStorage;
};

const getMetadataGlobal = (): GraphqlMetadataGlobal => globalThis as GraphqlMetadataGlobal;

export class GraphqlMetadataStorage {
  private static instance: GraphqlMetadataStorage | undefined;

  static get(): GraphqlMetadataStorage {
    if (!this.instance) {
      const globalObject = getMetadataGlobal();
      const existing = globalObject[GLOBAL_GRAPHQL_METADATA_KEY];
      if (existing) {
        this.instance = existing;
      } else {
        this.instance = new GraphqlMetadataStorage();
        globalObject[GLOBAL_GRAPHQL_METADATA_KEY] = this.instance;
      }
    }
    return this.instance;
  }

  private readonly objectTypes = new Map<ClassType, ObjectTypeDefinition>();
  private readonly inputTypes = new Map<ClassType, ObjectTypeDefinition>();
  private readonly fieldDefinitions = new Map<ClassType, FieldDefinition[]>();
  private readonly resolverClasses = new Map<ClassType, ResolverClassDefinition>();
  private readonly resolverParams = new Map<string, ResolverParamDefinition[]>();
  private readonly enumTypes = new Map<object, EnumTypeDefinition>();
  private readonly enumTypesByName = new Map<string, EnumTypeDefinition>();
  private readonly scalarTypesByName = new Map<string, ScalarTypeDefinition>();

  private constructor() {}

  addObjectType(target: ClassType, options: ObjectTypeOptions = {}): void {
    this.objectTypes.set(target, {
      target,
      kind: 'object',
      ...options,
    });
  }

  addInputType(target: ClassType, options: ObjectTypeOptions = {}): void {
    this.inputTypes.set(target, {
      target,
      kind: 'input',
      ...options,
    });
  }

  addField(definition: FieldDefinition): void {
    const entries = this.fieldDefinitions.get(definition.target) ?? [];
    entries.push(definition);
    this.fieldDefinitions.set(definition.target, entries);
  }

  upsertResolver(target: ClassType, objectTypeThunk?: TypeThunk): ResolverClassDefinition {
    let resolver = this.resolverClasses.get(target);
    if (!resolver) {
      resolver = {
        target,
        objectTypeThunk,
        queries: [],
        mutations: [],
        fields: [],
      };
      this.resolverClasses.set(target, resolver);
      return resolver;
    }

    if (objectTypeThunk) {
      resolver.objectTypeThunk = objectTypeThunk;
    }

    return resolver;
  }

  addResolverMethod(definition: ResolverMethodDefinition): void {
    const resolver = this.upsertResolver(definition.target);
    switch (definition.kind) {
      case 'query':
        resolver.queries.push(definition);
        break;
      case 'mutation':
        resolver.mutations.push(definition);
        break;
      case 'field':
        resolver.fields.push(definition);
        break;
      default:
        throw new Error(`Unsupported resolver kind: ${definition.kind}`);
    }
  }

  setResolveReference(definition: ResolverMethodDefinition): void {
    const resolver = this.upsertResolver(definition.target);
    resolver.resolveReference = definition;
  }

  addResolverParam(definition: ResolverParamDefinition): void {
    const key = resolverMethodKey(definition.target, definition.methodName);
    const params = this.resolverParams.get(key) ?? [];
    params.push(definition);
    this.resolverParams.set(key, params);
  }

  addEnumType(enumRef: object, definition: Omit<EnumTypeDefinition, 'enumRef'>): EnumTypeDefinition {
    if (typeof enumRef !== 'object' || enumRef === null) {
      throw new Error('registerEnumType requires a non-null enum reference object');
    }

    const existingByRef = this.enumTypes.get(enumRef);
    if (existingByRef) {
      if (existingByRef.name !== definition.name) {
        throw new Error(
          `Enum has already been registered under the name "${existingByRef.name}". ` +
            'Use a unique name per enum reference.',
        );
      }
      this.enumTypes.set(enumRef, { ...existingByRef, ...definition, enumRef });
      this.enumTypesByName.set(definition.name, { ...existingByRef, ...definition, enumRef });
      return this.enumTypes.get(enumRef)!;
    }

    const existingByName = this.enumTypesByName.get(definition.name);
    if (existingByName && existingByName.enumRef !== enumRef) {
      throw new Error(`GraphQL enum name "${definition.name}" is already registered to a different enum.`);
    }

    const stored: EnumTypeDefinition = {
      ...definition,
      enumRef,
    };

    this.enumTypes.set(enumRef, stored);
    this.enumTypesByName.set(definition.name, stored);
    return stored;
  }

  getEnumTypeByRef(enumRef: object): EnumTypeDefinition | undefined {
    return this.enumTypes.get(enumRef);
  }

  getEnumTypeByName(name: string): EnumTypeDefinition | undefined {
    return this.enumTypesByName.get(name);
  }

  getEnumTypes(): EnumTypeDefinition[] {
    return Array.from(this.enumTypesByName.values());
  }

  addScalarType(definition: ScalarTypeDefinition, { overwrite = false } = {}): ScalarTypeDefinition {
    const existing = this.scalarTypesByName.get(definition.name);
    if (existing && !overwrite) {
      if (existing.scalar !== definition.scalar || existing.description !== definition.description) {
        throw new Error(
          `GraphQL scalar "${definition.name}" is already registered. Pass overwrite: true to replace it.`,
        );
      }
      return existing;
    }

    this.scalarTypesByName.set(definition.name, definition);
    return definition;
  }

  getScalarType(name: string): ScalarTypeDefinition | undefined {
    return this.scalarTypesByName.get(name);
  }

  getScalarTypes(): ScalarTypeDefinition[] {
    return Array.from(this.scalarTypesByName.values());
  }

  getObjectTypes(): Array<ObjectTypeDefinition & { fields: FieldDefinition[] }> {
    return Array.from(this.objectTypes.values()).map((definition) => ({
      ...definition,
      fields: [...(this.fieldDefinitions.get(definition.target) ?? [])],
    }));
  }

  getInputTypes(): Array<ObjectTypeDefinition & { fields: FieldDefinition[] }> {
    return Array.from(this.inputTypes.values()).map((definition) => ({
      ...definition,
      fields: [...(this.fieldDefinitions.get(definition.target) ?? [])],
    }));
  }

  getObjectTypeDefinition(target: ClassType): ObjectTypeDefinition | undefined {
    return this.objectTypes.get(target);
  }

  getInputTypeDefinition(target: ClassType): ObjectTypeDefinition | undefined {
    return this.inputTypes.get(target);
  }

  getResolverClasses(): ResolverClassDefinition[] {
    return Array.from(this.resolverClasses.values()).map((resolver) => ({
      ...resolver,
      queries: [...resolver.queries],
      mutations: [...resolver.mutations],
      fields: [...resolver.fields],
      resolveReference: resolver.resolveReference,
    }));
  }

  getResolverParams(target: ClassType, methodName: string | symbol): ResolverParamDefinition[] {
    const key = resolverMethodKey(target, methodName);
    return [...(this.resolverParams.get(key) ?? [])].sort((a, b) => a.index - b.index);
  }

  clear(): void {
    this.objectTypes.clear();
    this.inputTypes.clear();
    this.fieldDefinitions.clear();
    this.resolverClasses.clear();
    this.resolverParams.clear();
    this.enumTypes.clear();
    this.enumTypesByName.clear();
    this.scalarTypesByName.clear();
    const globalObject = getMetadataGlobal();
    globalObject[GLOBAL_GRAPHQL_METADATA_KEY] = this;
  }
}
