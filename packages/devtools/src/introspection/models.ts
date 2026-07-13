import { getRegisteredDocuments } from '@nl-framework/orm';
import type { DocumentClass, MongoConnection } from '@nl-framework/orm';

export interface ModelIndexDescriptor {
  keys: unknown;
  options?: Record<string, unknown>;
}

export interface ModelRelationDescriptor {
  /** The indexed foreign-key field, e.g. `projectId`. */
  field: string;
  /** The related model this field appears to reference. */
  target: string;
  cardinality: 'one' | 'many';
}

export interface ModelDescriptor {
  name: string;
  collection: string;
  timestamps: boolean;
  softDelete: boolean;
  indexes: ModelIndexDescriptor[];
  /** Relations inferred from indexed `<name>Id` / `<name>Ids` key fields. */
  relations: ModelRelationDescriptor[];
}

export interface ModelCatalog {
  models: ModelDescriptor[];
  stats: {
    models: number;
    indexes: number;
    relations: number;
  };
}

const singularize = (value: string): string => {
  if (value.endsWith('ies')) {
    return `${value.slice(0, -3)}y`;
  }
  if (value.endsWith('s')) {
    return value.slice(0, -1);
  }
  return value;
};

const foreignKeyMatch = (field: string): { base: string; cardinality: 'one' | 'many' } | null => {
  const many = /^(.*)Ids$/.exec(field);
  if (many?.[1]) {
    return { base: many[1], cardinality: 'many' };
  }
  const one = /^(.*)Id$/.exec(field);
  if (one?.[1]) {
    return { base: one[1], cardinality: 'one' };
  }
  return null;
};

const indexKeyFields = (keys: unknown): string[] => {
  if (typeof keys === 'string') {
    return [keys];
  }
  if (Array.isArray(keys)) {
    return keys.flatMap((entry) => indexKeyFields(entry));
  }
  if (keys && typeof keys === 'object') {
    return Object.keys(keys as Record<string, unknown>);
  }
  return [];
};

/**
 * Build the data-model catalog from the ORM document registry: every
 * `@Document` entity with its collection, timestamp/soft-delete flags, and
 * declared `@Index` list. Read-only.
 */
export const buildModelCatalog = (): ModelCatalog => {
  const models: ModelDescriptor[] = getRegisteredDocuments()
    .map((metadata) => ({
      name: metadata.target.name,
      collection: metadata.collection,
      timestamps: metadata.timestamps,
      softDelete: metadata.softDelete,
      indexes: metadata.indexes.map((index) => ({
        keys: index.keys,
        options: index.options as Record<string, unknown> | undefined,
      })),
      relations: [] as ModelRelationDescriptor[],
    }))
    .sort((a, b) => a.collection.localeCompare(b.collection));

  // Infer relations from indexed foreign-key fields. Grounded in real @Index
  // metadata (ORM documents carry no field types), so indexed join paths — the
  // ones that actually matter — surface, without guessing at untracked columns.
  // Match a `<name>Id` base to a model whose class name or (de-underscored)
  // singular collection equals or ends with it, so `projectId` finds
  // `AzureDevOpsProject` / `azure_devops_projects`.
  const findTarget = (base: string): string | undefined => {
    const b = base.toLowerCase();
    if (b.length < 3) {
      return undefined;
    }
    let suffixMatch: string | undefined;
    for (const model of models) {
      const name = model.name.toLowerCase();
      const collection = singularize(model.collection).toLowerCase().replace(/_/g, '');
      if (name === b || collection === b) {
        return model.name;
      }
      if (!suffixMatch && (name.endsWith(b) || collection.endsWith(b))) {
        suffixMatch = model.name;
      }
    }
    return suffixMatch;
  };

  for (const model of models) {
    const seen = new Set<string>();
    for (const index of model.indexes) {
      for (const field of indexKeyFields(index.keys)) {
        const match = foreignKeyMatch(field);
        if (!match || seen.has(field)) {
          continue;
        }
        const target = findTarget(match.base);
        if (target && target !== model.name) {
          seen.add(field);
          model.relations.push({ field, target, cardinality: match.cardinality });
        }
      }
    }
  }

  return {
    models,
    stats: {
      models: models.length,
      indexes: models.reduce((total, model) => total + model.indexes.length, 0),
      relations: models.reduce((total, model) => total + model.relations.length, 0),
    },
  };
};

export type SampledFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'objectId'
  | 'array'
  | 'object'
  | 'null'
  | 'unknown';

export interface SampledField {
  name: string;
  type: SampledFieldType;
}

export interface SampledSchema {
  model: string;
  collection: string;
  /** True once a real document was read; false when the collection is empty. */
  sampled: boolean;
  fields: SampledField[];
}

export interface ModelStats {
  model: string;
  collection: string;
  /** Fast, index-based estimate — not an exact `countDocuments`. */
  estimatedCount: number;
  indexes: Array<{ name: string; sizeBytes?: number }>;
}

const isObjectIdLike = (value: object): boolean => {
  const tag = (value as { _bsontype?: string })._bsontype;
  return tag === 'ObjectID' || tag === 'ObjectId' || value.constructor?.name === 'ObjectId';
};

const inferFieldType = (value: unknown): SampledFieldType => {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return t;
  if (t === 'object' && isObjectIdLike(value as object)) return 'objectId';
  if (t === 'object') return 'object';
  return 'unknown';
};

/**
 * Infer top-level field names and coarse types from a single sampled document.
 * Pure — no DB access — so it is unit-testable and value-agnostic (only shapes,
 * never the values themselves, reach the client).
 */
export const inferSchemaFromDocument = (doc: Record<string, unknown> | null | undefined): SampledField[] => {
  if (!doc || typeof doc !== 'object') {
    return [];
  }
  return Object.keys(doc)
    .map((name) => ({ name, type: inferFieldType(doc[name]) }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Read ONE document from a model's collection and infer its schema. Opt-in and
 * read-only. Errors bubble to the caller, which renders them as an empty state.
 */
export const sampleModelSchema = async (
  connection: MongoConnection,
  documentClass: DocumentClass,
  collection: string,
): Promise<SampledSchema> => {
  const col = await connection.getCollection(documentClass);
  const doc = (await col.findOne({})) as Record<string, unknown> | null;
  return {
    model: documentClass.name,
    collection,
    sampled: doc !== null,
    fields: inferSchemaFromDocument(doc),
  };
};

/** Live collection stats: estimated count + per-index storage sizes (best effort). */
export const readModelStats = async (
  connection: MongoConnection,
  documentClass: DocumentClass,
  collection: string,
): Promise<ModelStats> => {
  const col = await connection.getCollection(documentClass);
  const estimatedCount = await col.estimatedDocumentCount();
  const indexList = (await col.indexes()) as Array<{ name?: string }>;

  let indexSizes: Record<string, number> = {};
  try {
    const [storage] = (await col
      .aggregate([{ $collStats: { storageStats: {} } }])
      .toArray()) as Array<{ storageStats?: { indexSizes?: Record<string, number> } }>;
    indexSizes = storage?.storageStats?.indexSizes ?? {};
  } catch {
    // $collStats unavailable (e.g. permissions / older server) — sizes omitted.
  }

  return {
    model: documentClass.name,
    collection,
    estimatedCount,
    indexes: indexList
      .filter((index): index is { name: string } => typeof index.name === 'string')
      .map((index) => ({ name: index.name, sizeBytes: indexSizes[index.name] })),
  };
};

/** Look up registered document metadata by model class name. */
export const findModelByName = (
  name: string,
): { target: DocumentClass; collection: string } | undefined => {
  const metadata = getRegisteredDocuments().find((doc) => doc.target.name === name);
  return metadata ? { target: metadata.target as DocumentClass, collection: metadata.collection } : undefined;
};
