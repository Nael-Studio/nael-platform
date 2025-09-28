import {
  Module,
  type Provider,
  type ClassType,
  type Token,
  ConfigLoader,
  ConfigService,
  GLOBAL_PROVIDERS,
  type ConfigLoadOptions,
  type ApplicationOptions,
} from '@nl-framework/core';

import {
  CONFIG_MODULE_OPTIONS,
  CONFIG_SOURCE_TOKEN,
  getConfigFeatureToken,
} from './tokens';
import type {
  ConfigModuleOptions,
  ConfigModuleAsyncOptions,
  ConfigModuleOptionsFactory,
  ConfigFeatureOptions,
  ConfigTransform,
} from './interfaces';

interface NormalizedConfigModuleOptions {
  loaderOptions: ConfigLoadOptions;
  transform?: ConfigTransform;
}

type PlainObject = Record<string, unknown>;

const arrayWrap = <T>(value?: T | T[]): T[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value : [value];
};

const normalizeConfigModuleOptions = (
  options: ConfigModuleOptions = {},
): NormalizedConfigModuleOptions => {
  const loaderOptions: ConfigLoadOptions = {
    dir: options.dir,
    env: options.env,
    overrides: options.overrides,
  };

  const files = options.path ? arrayWrap(options.path) : options.files;
  if (files?.length) {
    loaderOptions.files = [...files];
  }

  return {
    loaderOptions,
    transform: options.transform,
  } satisfies NormalizedConfigModuleOptions;
};

const mergeLoadOptions = (
  base: ConfigLoadOptions | undefined,
  overrides: ConfigLoadOptions,
): ConfigLoadOptions => {
  const merged: ConfigLoadOptions = {
    ...(base ?? {}),
  };

  if (overrides.dir !== undefined) {
    merged.dir = overrides.dir;
  }

  if (overrides.env !== undefined) {
    merged.env = overrides.env;
  }

  if (overrides.files !== undefined) {
    merged.files = [...overrides.files];
  }

  if (overrides.overrides !== undefined) {
    merged.overrides = {
      ...(base?.overrides ?? {}),
      ...overrides.overrides,
    } satisfies PlainObject;
  }

  return merged;
};

const createOptionsProvider = (options: ConfigModuleOptions): Provider => ({
  provide: CONFIG_MODULE_OPTIONS,
  useValue: normalizeConfigModuleOptions(options),
});

const createAsyncOptionsProvider = (
  options: ConfigModuleAsyncOptions,
): Provider => {
  if (options.useFactory) {
    return {
      provide: CONFIG_MODULE_OPTIONS,
      useFactory: async (...args: unknown[]) =>
        normalizeConfigModuleOptions(await options.useFactory!(...args)),
      inject: options.inject ?? [],
    } satisfies Provider;
  }

  const target = options.useExisting ?? options.useClass;
  if (!target) {
    throw new Error(
      'ConfigModule.forRootAsync requires either useFactory, useClass, or useExisting to be configured.',
    );
  }

  return {
    provide: CONFIG_MODULE_OPTIONS,
    useFactory: async (factory: ConfigModuleOptionsFactory) =>
      normalizeConfigModuleOptions(await factory.createConfigOptions()),
    inject: [target],
  } satisfies Provider;
};

const createAsyncProviders = (options: ConfigModuleAsyncOptions): Provider[] => {
  if (options.useFactory || options.useExisting) {
    return [];
  }

  if (!options.useClass) {
    throw new Error(
      'ConfigModule.forRootAsync requires useClass when neither useFactory nor useExisting are provided.',
    );
  }

  return [
    {
      provide: options.useClass,
      useClass: options.useClass,
    },
  ];
};

const createRootProviders = (): Provider[] => [
  {
    provide: CONFIG_SOURCE_TOKEN,
    useFactory: async (
      options: NormalizedConfigModuleOptions,
      appOptions?: ApplicationOptions,
    ) => {
      const mergedOptions = mergeLoadOptions(appOptions?.config, options.loaderOptions);
      const loaded = await ConfigLoader.load(mergedOptions);
      const transformed = options.transform
        ? await options.transform(loaded as PlainObject)
        : (loaded as PlainObject);
      return transformed;
    },
    inject: [CONFIG_MODULE_OPTIONS, GLOBAL_PROVIDERS.appOptions],
  },
  {
    provide: ConfigService,
    useFactory: (config: PlainObject) => new ConfigService(config),
    inject: [CONFIG_SOURCE_TOKEN],
  },
  {
    provide: GLOBAL_PROVIDERS.config,
    useFactory: (service: ConfigService) => service,
    inject: [ConfigService],
  },
];

const createFeatureProvider = <T>(options: ConfigFeatureOptions<T>): Provider<T> => {
  const token = (options.token ?? getConfigFeatureToken(options.path)) as Token<T>;

  return {
    provide: token,
    useFactory: async (service: ConfigService) => {
      const value = service.get(options.path);
      if (options.transform) {
        return (await options.transform(value)) as T;
      }
      return value as T;
    },
    inject: [ConfigService],
  } satisfies Provider<T>;
};

export class ConfigModule {
  static forRoot(options: ConfigModuleOptions = {}): ClassType {
    const providers: Provider[] = [
      createOptionsProvider(options),
      ...createRootProviders(),
    ];

    @Module({
      providers,
      exports: [ConfigService, GLOBAL_PROVIDERS.config, CONFIG_SOURCE_TOKEN],
    })
    class ConfigRootModule {}

    return ConfigRootModule;
  }

  static forRootAsync(options: ConfigModuleAsyncOptions): ClassType {
    const providers: Provider[] = [
      createAsyncOptionsProvider(options),
      ...createRootProviders(),
      ...createAsyncProviders(options),
    ];

    @Module({
      imports: options.imports ?? [],
      providers,
      exports: [ConfigService, GLOBAL_PROVIDERS.config, CONFIG_SOURCE_TOKEN],
    })
    class ConfigRootAsyncModule {}

    return ConfigRootAsyncModule;
  }

  static forFeature<T = unknown>(pathOrOptions: string | ConfigFeatureOptions<T>): ClassType {
    const featureOptions: ConfigFeatureOptions<T> =
      typeof pathOrOptions === 'string'
        ? { path: pathOrOptions }
        : pathOrOptions;

    if (!featureOptions.path) {
      throw new Error('ConfigModule.forFeature requires a path to be provided.');
    }

    const providers: Provider[] = [createFeatureProvider(featureOptions)];
    const exportToken = (featureOptions.token ?? getConfigFeatureToken(featureOptions.path)) as Token;

    @Module({
      providers,
      exports: [exportToken],
    })
    class ConfigFeatureModule {}

    return ConfigFeatureModule;
  }
}
