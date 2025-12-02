import type { Token } from '@nl-framework/core';
import type { MicroserviceExceptionFilter } from './exception-filter.interface';

export type MicroserviceExceptionFilterToken =
  | Token<MicroserviceExceptionFilter>
  | MicroserviceExceptionFilter;
