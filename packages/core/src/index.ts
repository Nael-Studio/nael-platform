import 'reflect-metadata';

export { Application, ApplicationContext, type ApplicationOptions } from './application.js';
export { Container } from './container/container.js';
export { Injectable, isInjectable } from './decorators/injectable.js';
export { Inject } from './decorators/inject.js';
export { Module, getModuleMetadata } from './decorators/module.js';
export { Controller, getControllerPrefix } from './decorators/controller.js';
export type { ModuleMetadata } from './interfaces/module.js';
export type {
  Provider,
  ClassProvider,
  ValueProvider,
  FactoryProvider,
  Token,
  ClassType,
} from './interfaces/provider.js';
export { ConfigLoader } from './config/config-loader.js';
export { ConfigService } from './config/config.service.js';
export type { ConfigLoadOptions } from './config/config-loader.js';
export type { OnModuleInit, OnModuleDestroy } from './lifecycle/hooks.js';
export { GLOBAL_PROVIDERS } from './constants.js';
