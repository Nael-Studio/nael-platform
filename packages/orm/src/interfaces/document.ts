import type { ClassType } from '@nl-framework/core';

export type DocumentClass<T = object> = ClassType<T>;

export interface DocumentOptions {
  collection?: string;
  timestamps?: boolean;
  softDelete?: boolean;
}

export interface DocumentMetadata {
  target: DocumentClass;
  collection: string;
  timestamps: boolean;
  softDelete: boolean;
}

export interface BaseDocument {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}
