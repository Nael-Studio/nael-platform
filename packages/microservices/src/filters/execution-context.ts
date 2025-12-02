import type { Logger } from '@nl-framework/logger';
import type { MessagePattern } from '../interfaces/transport';
import type { MicroserviceExceptionContext } from './exception-filter.interface';

export interface MicroserviceExceptionContextOptions {
  pattern: MessagePattern;
  data: unknown;
  metadata?: Record<string, string>;
  controller: object;
  handlerName: string;
  isEvent: boolean;
  logger?: Logger;
}

export const createMicroserviceExceptionContext = (
  options: MicroserviceExceptionContextOptions,
): MicroserviceExceptionContext => ({
  pattern: options.pattern,
  data: options.data,
  metadata: options.metadata,
  controller: options.controller,
  handlerName: options.handlerName,
  isEvent: options.isEvent,
  logger: options.logger,
});
