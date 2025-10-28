import 'reflect-metadata';

export { Application, ApplicationContext, type ApplicationOptions } from './application';
export { Container } from './container/container';
export { Injectable, isInjectable } from './decorators/injectable';
export { Inject } from './decorators/inject';
export { Module, getModuleMetadata } from './decorators/module';
export { Controller, getControllerPrefix } from './decorators/controller';
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
