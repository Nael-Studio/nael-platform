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
}

export interface DocumentMetadata {
  target: DocumentClass;
  collection: string;
  timestamps: boolean;
  softDelete: boolean;
  indexes: DocumentIndexSpec[];
}

export interface BaseDocument {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}
