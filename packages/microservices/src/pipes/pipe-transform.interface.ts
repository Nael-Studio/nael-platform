import type { ClassType } from '@nl-framework/core';
import type { MessagePattern } from '../interfaces/transport';

/**
 * Metadata handed to a microservice pipe. Structurally compatible with HTTP's
 * `ArgumentMetadata` (a `{ type, metatype, data }` bag) so a `ValidationPipe`
 * written for HTTP can validate a message payload unchanged.
 */
export interface MicroserviceArgumentMetadata {
  type: 'payload';
  metatype?: unknown;
  /** The pattern the payload arrived on. */
  data?: MessagePattern;
}

export interface MicroservicePipeTransform<T = unknown, R = unknown> {
  transform(value: T, metadata: MicroserviceArgumentMetadata): R | Promise<R>;
}

export type MicroservicePipeToken =
  | ClassType<MicroservicePipeTransform>
  | MicroservicePipeTransform;
