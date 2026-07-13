import type { DocumentClass, HookType } from '../interfaces/document';
import { getDocumentMetadata } from './document';

const registerHook =
  (type: HookType): MethodDecorator =>
  (target, propertyKey) => {
    if (typeof propertyKey !== 'string') {
      return;
    }
    const documentClass = (target as { constructor: DocumentClass }).constructor;
    const metadata = getDocumentMetadata(documentClass);
    metadata.hooks ??= {};
    (metadata.hooks[type] ??= []).push(propertyKey);
  };

/**
 * Lifecycle hooks. Decorated instance methods run on the hydrated entity around
 * entity-based writes (`insert*`, `save`). They run in declaration order, are
 * awaited sequentially, and a throw aborts the write.
 *
 * Before-hooks may mutate the entity and run **before** validation and before
 * the document is prepared for the driver. Filter-based bulk paths
 * (`updateMany`, `updateOne`, `bulkWrite`, `bulkUpsert`) do **not** run
 * per-entity hooks.
 */
export const BeforeInsert = (): MethodDecorator => registerHook('beforeInsert');
export const AfterInsert = (): MethodDecorator => registerHook('afterInsert');
export const BeforeUpdate = (): MethodDecorator => registerHook('beforeUpdate');
export const AfterUpdate = (): MethodDecorator => registerHook('afterUpdate');
export const BeforeDelete = (): MethodDecorator => registerHook('beforeDelete');
export const AfterDelete = (): MethodDecorator => registerHook('afterDelete');
