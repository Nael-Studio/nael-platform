import type { ConfigLoadOptions } from '@nl-framework/core';
import type { ClassType, Token } from '@nl-framework/core';

export type ConfigTransform = (
  config: Record<string, unknown>,
) => Record<string, unknown> | Promise<Record<string, unknown>>;

export interface ConfigModuleOptions extends ConfigLoadOptions {
  /**
   * Optional single file or list of files to load in addition to `default.yaml`.
   * When provided, overrides the computed set of files based on env detection.
   */
  path?: string | string[];
  /**
   * Optional transform to adjust the loaded configuration before it is exposed through the service.
   */
  transform?: ConfigTransform;
}

export interface ConfigModuleOptionsFactory {
  createConfigOptions(): Promise<ConfigModuleOptions> | ConfigModuleOptions;
}

export interface ConfigModuleAsyncOptions {
  imports?: ClassType[];
  inject?: Token[];
  useExisting?: Token<ConfigModuleOptionsFactory>;
  useClass?: ClassType<ConfigModuleOptionsFactory>;
  useFactory?: (...args: unknown[]) => Promise<ConfigModuleOptions> | ConfigModuleOptions;
}

export interface ConfigFeatureOptions<T = unknown> {
  path: string;
  token?: Token<T>;
  transform?: (value: unknown) => T | Promise<T>;
}
