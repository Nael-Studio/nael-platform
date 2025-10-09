import type { ClassType } from '@nl-framework/core';
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
  const metadata: DocumentMetadata = {
    target: documentClass,
    collection,
    timestamps: options.timestamps ?? true,
    softDelete: options.softDelete ?? true,
  };

  documentRegistry.set(documentClass, metadata);
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
  };

  documentRegistry.set(target, metadata);
  return metadata;
};

export const getRegisteredDocuments = (): DocumentMetadata[] => Array.from(documentRegistry.values());

export const clearDocumentRegistry = (): void => {
  documentRegistry.clear();
};
