import type { Logger } from '@nl-framework/logger';
import type { MessagePattern } from '../interfaces/transport';

export interface MicroserviceExceptionContext {
  pattern: MessagePattern;
  data: unknown;
  metadata?: Record<string, string>;
  controller: object;
  handlerName: string;
  isEvent: boolean;
  logger?: Logger;
}

export interface MicroserviceExceptionFilter<TResult = unknown> {
  catch(
    exception: Error,
    context: MicroserviceExceptionContext,
  ): TResult | void | Promise<TResult | void>;
}
