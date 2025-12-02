import 'reflect-metadata';

export { Application, ApplicationContext, type ApplicationOptions } from './application';
export { Container } from './container/container';
export { Injectable, isInjectable, getInjectableMetadata } from './decorators/injectable';
export type { InjectableOptions, InjectableMetadata } from './decorators/injectable';
export { Inject } from './decorators/inject';
export { Module, getModuleMetadata } from './decorators/module';
export { Controller, getControllerPrefix } from './decorators/controller';
export { SetMetadata, type CustomDecorator } from './decorators/set-metadata';
export {
  type ExceptionFilter,
  Catch,
  UseFilters,
  getCatchTypes,
  getUseFilters,
} from './decorators/filters';
export {
  type PipeTransform,
  UsePipes,
  getUsePipes,
} from './decorators/pipes';
export {
  type CanActivate,
  type GuardToken,
  UseGuards,
  getGuards,
  type GuardContext,
} from './decorators/guards';
export {
  type Interceptor,
  type InterceptorToken,
  UseInterceptors,
  getInterceptors,
  type InterceptorContext,
  type CallHandler,
} from './decorators/interceptors';
export type { ModuleMetadata } from './interfaces/module';
export type {
  Provider,
  ClassProvider,
  ValueProvider,
  FactoryProvider,
  Token,
  ClassType,
} from './interfaces/provider';
export { forwardRef, isForwardRef } from './interfaces/provider';
export { Scope, createContextId, DEFAULT_CONTEXT_ID } from './scope';
export type { ContextId } from './scope';
export { ModuleRef } from './module-ref';
export type { ModuleRefResolveOptions } from './module-ref';
export { LazyModuleLoader } from './lazy-module-loader';
export type { ModuleLoadResult, ModuleLoadListener } from './module-manager';
export { ConfigLoader } from './config/config-loader';
export { ConfigService } from './config/config.service';
export type { ConfigLoadOptions } from './config/config-loader';
export type { OnModuleInit, OnModuleDestroy } from './lifecycle/hooks';
export { GLOBAL_PROVIDERS } from './constants';
export {
  transformAndValidate,
  ValidationException,
  type ValidationIssue,
  type TransformValidationOptions,
} from './utils/validation';
export { serialize, type SerializationOptions } from './utils/serialization';
export { SerializeOptions, getSerializationOptions } from './decorators/serialization-options';
export {
  buildCacheKey,
  InMemoryCacheStore,
  RedisCacheStore,
  type CacheStore,
  type CacheSetOptions,
  type InMemoryCacheOptions,
  type RedisCacheOptions,
} from './cache';
export { ApplicationException } from './exceptions/application-exception';
export { getHttpStatusFromException, createHttpException } from './exceptions/http-utils';
export { getGraphQLCodeFromException, toGraphQLError, createGraphQLException } from './exceptions/graphql-utils';
