import type { ClassType } from '@nl-framework/core';
import type { CreateIndexesOptions, IndexSpecification } from 'mongodb';
import type { DocumentMetadata, DocumentOptions, DocumentClass } from '../interfaces/document';

const documentRegistry = new Map<DocumentClass, DocumentMetadata>();

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
  const metadata: DocumentMetadata = {
    target: documentClass,
    collection,
    timestamps: options.timestamps ?? true,
    softDelete: options.softDelete ?? true,
    indexes: [...(options.indexes ?? []), ...(existing?.indexes ?? [])],
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
  };

  documentRegistry.set(target, metadata);
  return metadata;
};

export const getRegisteredDocuments = (): DocumentMetadata[] => Array.from(documentRegistry.values());

export const clearDocumentRegistry = (): void => {
  documentRegistry.clear();
};
