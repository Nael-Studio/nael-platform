import { Injectable, Module } from '@nl-framework/core';
import type { ClassType, Provider, Token } from '@nl-framework/core';
import type { StorageAdapter } from './types';

export const STORAGE_ADAPTER = Symbol.for('nl:storage:adapter');

export interface StorageModuleOptions {
  adapter: StorageAdapter;
  imports?: ClassType[];
}

export interface StorageModuleAsyncOptions {
  imports?: ClassType[];
  inject?: Token[];
  useFactory: (...args: unknown[]) => StorageAdapter | Promise<StorageAdapter>;
}

export const createStorageModule = (
  options: StorageModuleOptions | StorageModuleAsyncOptions,
): ClassType => {
  const providers: Provider[] = [];

  if ('adapter' in options) {
    providers.push({
      provide: STORAGE_ADAPTER,
      useValue: options.adapter,
    });
  } else {
    providers.push({
      provide: STORAGE_ADAPTER,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    });
  }

  @Injectable()
  class StorageAdapterHolder {
    constructor(public readonly adapter: StorageAdapter) {}
  }

  providers.push({
    provide: StorageAdapterHolder,
    useFactory: (adapter: StorageAdapter) => new StorageAdapterHolder(adapter),
    inject: [STORAGE_ADAPTER],
  });

  @Module({
    imports: options.imports ?? [],
    providers,
    exports: [STORAGE_ADAPTER, StorageAdapterHolder],
  })
  class StorageModule {}

  return StorageModule;
};
