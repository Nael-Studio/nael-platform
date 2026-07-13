import type { ObjectId } from 'mongodb';
import type { DocumentClass, RelationKind, RelationMetadata } from '../interfaces/document';
import { getDocumentMetadata } from './document';

/**
 * A stored foreign key. On disk it is an `ObjectId` (or string id); after
 * `populate` it becomes the hydrated target instance `T`.
 */
export type Ref<T> = string | ObjectId | T;

/** Turns declared `Ref<...>` fields `K` of `T` into their populated target type. */
export type Populated<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: T[P] extends Ref<infer U> ? U : T[P] extends Array<Ref<infer V>> ? V[] : T[P];
};

const registerRelation =
  (kind: RelationKind, target: () => DocumentClass): PropertyDecorator =>
  (proto, propertyKey) => {
    if (typeof propertyKey !== 'string') {
      return;
    }
    const documentClass = (proto as { constructor: DocumentClass }).constructor;
    const metadata = getDocumentMetadata(documentClass);
    metadata.relations ??= [];
    const relation: RelationMetadata = { propertyKey, kind, target };
    const existing = metadata.relations.findIndex((r) => r.propertyKey === propertyKey);
    if (existing >= 0) {
      metadata.relations[existing] = relation;
    } else {
      metadata.relations.push(relation);
    }
  };

/** Single reference to another document, stored as its `ObjectId`. */
export const Ref = (target: () => DocumentClass): PropertyDecorator => registerRelation('ref', target);

/** Array of references to another document, stored as `ObjectId[]`. */
export const RefArray = (target: () => DocumentClass): PropertyDecorator =>
  registerRelation('refArray', target);

/** Embedded subdocument, hydrated into the target class on read. */
export const Embedded = (target: () => DocumentClass): PropertyDecorator =>
  registerRelation('embedded', target);
