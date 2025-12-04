import type { ClassType } from '@nl-framework/core';

export interface PipeTransform<T = any, R = any> {
  transform(value: T, metadata: ArgumentMetadata): R | Promise<R>;
}

export interface ArgumentMetadata {
  type: 'body' | 'query' | 'param' | 'custom' | 'headers' | 'request' | 'context';
  metatype?: any;
  data?: unknown;
}

export type PipeToken = ClassType<PipeTransform> | PipeTransform;
