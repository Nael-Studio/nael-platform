import type { ClassType } from '@nl-framework/core';
import type { CreateIndexesOptions, IndexSpecification } from 'mongodb';
import type {
  DocumentIndexSpec,
  DocumentMetadata,
  DocumentOptions,
  DocumentClass,
  PropMetadata,
} from '../interfaces/document';

const documentRegistry = new Map<DocumentClass, DocumentMetadata>();

/** Stable signature for a single-field index used to dedupe derived vs explicit. */
const singleFieldKey = (keys: IndexSpecification): string | null => {
  if (keys && typeof keys === 'object' && !Array.isArray(keys)) {
    const entries = Object.entries(keys as Record<string, unknown>);
    if (entries.length === 1) {
      return entries[0]![0];
    }
  }
  return null;
};

/**
 * Fold `@Prop({ unique })` / `@Prop({ index })` shorthands into the metadata
 * `indexes` array, skipping any field already covered by an explicitly declared
 * single-field index (explicit options win).
 */
const deriveIndexesFromProps = (indexes: DocumentIndexSpec[], props: PropMetadata[]): DocumentIndexSpec[] => {
  const explicitFields = new Set(
    indexes.map((spec) => singleFieldKey(spec.keys)).filter((field): field is string => field !== null),
  );
  const derived: DocumentIndexSpec[] = [];
  const seen = new Set<string>();

  for (const prop of props) {
    if (!prop.unique && !prop.index) {
      continue;
    }
    if (explicitFields.has(prop.propertyKey) || seen.has(prop.propertyKey)) {
      continue;
    }
    seen.add(prop.propertyKey);
    const direction = prop.index === -1 ? -1 : 1;
    derived.push({
      keys: { [prop.propertyKey]: direction } as IndexSpecification,
      options: prop.unique ? { unique: true } : undefined,
    });
  }

  return [...indexes, ...derived];
};

const defaultCollectionName = (target: ClassType): string =>
  target.name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();

const castDocumentClass = (target: Function): DocumentClass => target as unknown as DocumentClass;

export const Document = (options: DocumentOptions = {}): ClassDecorator => (target) => {
  const documentClass = castDocumentClass(target);
  const collection = options.collection ?? defaultCollectionName(target as unknown as ClassType);
  // Class decorators run bottom-up, so @Index may have registered metadata already — keep its indexes.
  const existing = documentRegistry.get(documentClass);
  const props = existing?.props ?? [];
  const declaredIndexes = [...(options.indexes ?? []), ...(existing?.indexes ?? [])];
  const metadata: DocumentMetadata = {
    target: documentClass,
    collection,
    timestamps: options.timestamps ?? true,
    softDelete: options.softDelete ?? true,
    indexes: deriveIndexesFromProps(declaredIndexes, props),
    props,
    hooks: existing?.hooks ?? {},
    relations: existing?.relations ?? [],
    versionField: existing?.versionField,
    hydrate: options.hydrate ?? true,
    validate: options.validate ?? false,
  };

  documentRegistry.set(documentClass, metadata);
};

/**
 * Declare an index on the document's collection. Repeatable; composes with
 * `@Document({ indexes: [...] })`. Indexes are created by
 * `MongoConnection.ensureIndexes()` (or automatically with `autoIndex: true`).
 */
export const Index = (
  keys: IndexSpecification,
  options?: CreateIndexesOptions,
): ClassDecorator => (target) => {
  const metadata = getDocumentMetadata(castDocumentClass(target));
  metadata.indexes.push({ keys, options });
};

export const getDocumentMetadata = <T extends object>(
  target: DocumentClass<T>,
): DocumentMetadata => {
  const existing = documentRegistry.get(target);
  if (existing) {
    return existing;
  }

  const metadata: DocumentMetadata = {
    target,
    collection: defaultCollectionName(target as unknown as ClassType),
    timestamps: true,
    softDelete: true,
    indexes: [],
    props: [],
    hooks: {},
    relations: [],
    hydrate: true,
    validate: false,
  };

  documentRegistry.set(target, metadata);
  return metadata;
};

export const getRegisteredDocuments = (): DocumentMetadata[] => Array.from(documentRegistry.values());

export const clearDocumentRegistry = (): void => {
  documentRegistry.clear();
};
