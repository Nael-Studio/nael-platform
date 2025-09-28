import 'reflect-metadata';

export { ConfigModule } from './module';
export type {
  ConfigModuleOptions,
  ConfigModuleAsyncOptions,
  ConfigModuleOptionsFactory,
  ConfigFeatureOptions,
  ConfigTransform,
} from './interfaces';
export { CONFIG_MODULE_OPTIONS, CONFIG_SOURCE_TOKEN, getConfigFeatureToken } from './tokens';
export { ConfigService, ConfigLoader } from '@nl-framework/core';
