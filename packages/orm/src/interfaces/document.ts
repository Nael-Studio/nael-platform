import type { ClassType } from '@nl-framework/core';

export type DocumentClass<T extends Record<string, unknown> = Record<string, unknown>> = ClassType<T>;

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
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}
