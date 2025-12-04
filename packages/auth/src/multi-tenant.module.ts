import { Module, type ClassType, type Provider } from '@nl-framework/core';
import { BETTER_AUTH_MULTI_TENANT_OPTIONS } from './constants';
import { BetterAuthMultiTenantService } from './multi-tenant.service';
import type {
  BetterAuthMultiTenantModuleAsyncOptions,
  BetterAuthMultiTenantOptions,
  BetterAuthMultiTenantOptionsFactory,
} from './interfaces/multi-tenant-options';

const ensureSyncOptions = (options: BetterAuthMultiTenantOptions): void => {
  if (!options?.resolver || !options?.loader) {
    throw new Error(
      'BetterAuthMultiTenantModule.register requires both a resolver and loader to be provided.',
    );
  }
};

const createAsyncOptionsProvider = (
  options: BetterAuthMultiTenantModuleAsyncOptions,
): Provider => {
  if (options.useFactory) {
    return {
      provide: BETTER_AUTH_MULTI_TENANT_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? [],
    } satisfies Provider;
  }

  const target = options.useExisting ?? options.useClass;
  if (!target) {
    throw new Error(
      'BetterAuthMultiTenantModule.registerAsync requires useFactory, useClass, or useExisting to resolve module options.',
    );
  }

  return {
    provide: BETTER_AUTH_MULTI_TENANT_OPTIONS,
    useFactory: async (factory: BetterAuthMultiTenantOptionsFactory) =>
      factory.createBetterAuthMultiTenantOptions(),
    inject: [target],
  } satisfies Provider;
};

const createAsyncProviders = (options: BetterAuthMultiTenantModuleAsyncOptions): Provider[] => {
  if (options.useFactory || options.useExisting) {
    return [];
  }

  if (!options.useClass) {
    throw new Error(
      'BetterAuthMultiTenantModule.registerAsync requires useClass when neither useFactory nor useExisting are provided.',
    );
  }

  return [
    {
      provide: options.useClass,
      useClass: options.useClass,
    },
  ];
};

export class BetterAuthMultiTenantModule {
  static register(options: BetterAuthMultiTenantOptions): ClassType {
    ensureSyncOptions(options);

    @Module({
      providers: [
        {
          provide: BETTER_AUTH_MULTI_TENANT_OPTIONS,
          useValue: options,
        },
        BetterAuthMultiTenantService,
      ],
      exports: [BetterAuthMultiTenantService, BETTER_AUTH_MULTI_TENANT_OPTIONS],
    })
    class BetterAuthMultiTenantRootModule {}

    return BetterAuthMultiTenantRootModule;
  }

  static registerAsync(options: BetterAuthMultiTenantModuleAsyncOptions): ClassType {
    const providers: Provider[] = [
      createAsyncOptionsProvider(options),
      ...createAsyncProviders(options),
    ];

    @Module({
      imports: options.imports ?? [],
      providers: [...providers, BetterAuthMultiTenantService],
      exports: [BetterAuthMultiTenantService, BETTER_AUTH_MULTI_TENANT_OPTIONS],
    })
    class BetterAuthMultiTenantAsyncModule {}

    return BetterAuthMultiTenantAsyncModule;
  }
}
