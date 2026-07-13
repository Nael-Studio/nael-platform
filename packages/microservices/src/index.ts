import 'reflect-metadata';

export { UseGuards, UseInterceptors, UsePipes, UseFilters } from '@nl-framework/core';

export type {
  MessagePattern as MessagePatternType,
  MessageContext,
  MessageHandler,
  MicroserviceSendOptions,
  Transport,
} from './interfaces/transport';

export {
  MessagePattern,
  EventPattern,
  getMessagePatternMetadata,
  listMessageHandlers,
} from './decorators/patterns';

export { MicroserviceClient } from './client/microservice-client';

export {
  DaprTransport,
  type DaprTransportOptions,
  type DaprHealthCheckOptions,
} from './transport/dapr-transport';

export { MicroserviceInvocationException } from './exceptions/microservice-invocation.exception';

export {
  MicroservicesModule,
  createMicroservicesModule,
  type MicroservicesModuleOptions,
} from './microservices.module';

// Exception filters
export type {
  MicroserviceExceptionFilter,
  MicroserviceExceptionContext,
} from './filters/exception-filter.interface';
export {
  registerMicroserviceExceptionFilter,
  registerMicroserviceExceptionFilters,
  listMicroserviceExceptionFilters,
  clearMicroserviceExceptionFilters,
} from './filters/registry';
export type { MicroserviceExceptionFilterToken } from './filters/types';

// Guards
export {
  createMicroserviceExecutionContext,
  type MicroserviceExecutionContext,
  type MicroserviceExecutionContextOptions,
} from './guards/execution-context';
export type {
  MicroserviceCanActivate,
  MicroserviceGuardDecision,
  MicroserviceGuardFunction,
  MicroserviceGuardToken,
} from './guards/types';
export {
  registerMicroserviceGuard,
  registerMicroserviceGuards,
  listMicroserviceGuards,
  clearMicroserviceGuards,
} from './guards/registry';

// Interceptors
export type {
  CallHandler,
  MicroserviceInterceptor,
  MicroserviceInterceptorFunction,
  MicroserviceInterceptorToken,
} from './interceptors/types';
export {
  registerMicroserviceInterceptor,
  registerMicroserviceInterceptors,
  listMicroserviceInterceptors,
  clearMicroserviceInterceptors,
} from './interceptors/registry';

// Pipes
export type {
  MicroserviceArgumentMetadata,
  MicroservicePipeTransform,
  MicroservicePipeToken,
} from './pipes/pipe-transform.interface';

// Dispatcher
export {
  MessageDispatcher,
  MICROSERVICE_DROP,
  isMicroserviceDropStatus,
  type MessageDispatcherOptions,
  type MicroserviceDropStatus,
} from './dispatcher/message-dispatcher';

// HTTP integration (Dapr subscription + invocation routes)
export {
  createMicroserviceRouteRegistrar,
  type MicroserviceRouteRegistrarOptions,
} from './http/route-registrar';
export {
  patternToSlug,
  patternToInvocationPath,
  patternToRoute,
  buildDaprSubscriptions,
  buildInvocationRoutes,
  INVOCATION_PREFIX,
  type DaprSubscription,
  type InvocationRoute,
  type HandlerDescriptor,
} from './routing';
