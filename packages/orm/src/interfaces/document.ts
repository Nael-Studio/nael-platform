import type { ClassType } from '@nl-framework/core';
import type { CreateIndexesOptions, IndexSpecification } from 'mongodb';

export type DocumentClass<T = object> = ClassType<T>;

export interface DocumentIndexSpec {
  keys: IndexSpecification;
  options?: CreateIndexesOptions;
}

export interface DocumentOptions {
  collection?: string;
  timestamps?: boolean;
  softDelete?: boolean;
  indexes?: DocumentIndexSpec[];
  /**
   * Return real class instances (via class-transformer) from reads, applying
   * `from` transforms and prop defaults. Defaults to `true` — plain objects were
   * never a documented contract, but see the release notes for the migration.
   */
  hydrate?: boolean;
  /** Run class-validator on write paths (`insert*`/`save`/`bulkUpsert`). Off by default. */
  validate?: boolean;
}

/** A pair of value transforms applied on the way out of / into the driver. */
export interface PropTransform {
  to?: (value: any) => any;
  from?: (value: any) => any;
}

/** Metadata captured for a single `@Prop()`-decorated field. */
export interface PropMetadata {
  propertyKey: string;
  /** Reflected `design:type` (the field's declared constructor), when available. */
  designType?: unknown;
  required: boolean;
  /** A literal default value, or a zero-arg factory called per write. */
  default?: unknown;
  enum?: object;
  unique?: boolean;
  index?: boolean | 1 | -1;
  transform?: PropTransform;
}

export type HookType =
  | 'beforeInsert'
  | 'afterInsert'
  | 'beforeUpdate'
  | 'afterUpdate'
  | 'beforeDelete'
  | 'afterDelete';

/** Method names collected per lifecycle hook, run on hydrated entity instances. */
export type DocumentHooks = Partial<Record<HookType, string[]>>;

export type RelationKind = 'ref' | 'refArray' | 'embedded';

/** Metadata for a `@Ref` / `@RefArray` / `@Embedded` field. */
export interface RelationMetadata {
  propertyKey: string;
  kind: RelationKind;
  /** Lazy accessor for the related document class (supports forward references). */
  target: () => DocumentClass;
}

export interface DocumentMetadata {
  target: DocumentClass;
  collection: string;
  timestamps: boolean;
  softDelete: boolean;
  indexes: DocumentIndexSpec[];
  /** Fields declared with `@Prop()`. Optional for hand-built metadata (tests). */
  props?: PropMetadata[];
  /** Lifecycle hook methods (`@BeforeInsert()`, …). */
  hooks?: DocumentHooks;
  /** `@Ref` / `@RefArray` / `@Embedded` relations. */
  relations?: RelationMetadata[];
  /** Property name marked with `@Version()` for optimistic locking. */
  versionField?: string;
  /** Whether reads hydrate into class instances. */
  hydrate?: boolean;
  /** Whether writes run class-validator. */
  validate?: boolean;
}

export interface BaseDocument {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}
