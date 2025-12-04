import 'reflect-metadata';

export { UseGuards, UseInterceptors, UsePipes } from '@nl-framework/core';

export type {
  MessagePattern as MessagePatternType,
  MessageContext,
  MessageHandler,
  Transport,
} from './interfaces/transport';

export {
  MessagePattern,
  EventPattern,
  getMessagePatternMetadata,
  listMessageHandlers,
} from './decorators/patterns';

export { MicroserviceClient } from './client/microservice-client';

export { DaprTransport, type DaprTransportOptions } from './transport/dapr-transport';

export {
  MicroservicesModule,
  createMicroservicesModule,
  type MicroservicesModuleOptions,
} from './microservices.module';
export type { MicroserviceExceptionFilter, MicroserviceExceptionContext } from './filters/exception-filter.interface';
export {
  registerMicroserviceExceptionFilter,
  registerMicroserviceExceptionFilters,
  listMicroserviceExceptionFilters,
  clearMicroserviceExceptionFilters,
} from './filters/registry';
export type { MicroserviceExceptionFilterToken } from './filters/types';
export { MessageDispatcher, type MessageDispatcherOptions } from './dispatcher/message-dispatcher';
