import type { DocumentClass } from '../interfaces/document';
import { getDocumentMetadata } from './document';

/**
 * Mark a numeric field as the optimistic-locking version. On `save()`/`updateOne`
 * the current version is added to the filter and the field is `$inc`-ed; a
 * concurrent write that already bumped it causes an `OptimisticLockException`.
 */
export const Version =
  (): PropertyDecorator =>
  (proto, propertyKey) => {
    if (typeof propertyKey !== 'string') {
      return;
    }
    const documentClass = (proto as { constructor: DocumentClass }).constructor;
    const metadata = getDocumentMetadata(documentClass);
    metadata.versionField = propertyKey;
  };
