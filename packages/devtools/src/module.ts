import { Module, enableBootRecording, type ClassType, type Provider } from '@nl-framework/core';
import { DEVTOOLS_OPTIONS } from './constants';
import type {
  NaelDevtoolsAsyncOptions,
  NaelDevtoolsOptions,
  NaelDevtoolsOptionsFactory,
  NormalizedDevtoolsOptions,
} from './interfaces/options';
import { evaluateGuard, normalizeDevtoolsOptions } from './options';
import { ensureDevtoolsIntegration } from './http/registrar';

const emptyModule = (): ClassType => {
  @Module({})
  class NaelDevtoolsDisabledModule {}
  return NaelDevtoolsDisabledModule;
};

const optionsValueProvider = (normalized: NormalizedDevtoolsOptions): Provider => ({
  provide: DEVTOOLS_OPTIONS,
  useValue: normalized,
});

const asyncOptionsProvider = (options: NaelDevtoolsAsyncOptions): Provider => {
  if (options.useFactory) {
    return {
      provide: DEVTOOLS_OPTIONS,
      useFactory: async (...args: unknown[]) => normalizeDevtoolsOptions(await options.useFactory!(...args)),
      inject: options.inject ?? [],
    };
  }

  const target = options.useExisting ?? options.useClass;
  if (!target) {
    throw new Error(
      'NaelDevtoolsModule.forRootAsync requires one of useFactory, useClass, or useExisting.',
    );
  }

  return {
    provide: DEVTOOLS_OPTIONS,
    useFactory: async (factory: NaelDevtoolsOptionsFactory) =>
      normalizeDevtoolsOptions(await factory.createDevtoolsOptions()),
    inject: [target],
  };
};

export class NaelDevtoolsModule {
  /**
   * Register the devtools dashboard. Disabled by default and blocked in
   * production unless `allowInProduction` is set — see {@link evaluateGuard}.
   * When the guard fails synchronously, an empty module is returned and nothing
   * is mounted.
   */
  static forRoot(options: NaelDevtoolsOptions = {}): ClassType {
    const normalized = normalizeDevtoolsOptions(options);

    if (!evaluateGuard(normalized).armed) {
      return emptyModule();
    }

    // Enable boot-timing capture now, before `app.bootstrap()` runs, so the Boot
    // report can show module init order + per-provider construction cost.
    enableBootRecording();
    ensureDevtoolsIntegration();

    @Module({
      providers: [optionsValueProvider(normalized)],
      exports: [DEVTOOLS_OPTIONS],
    })
    class NaelDevtoolsRootModule {}

    return NaelDevtoolsRootModule;
  }

  /**
   * Async registration — resolve options (e.g. `enabled` from config) at
   * bootstrap. The registrar is always installed but the same guard runs at
   * mount time, so a disabled/production result mounts zero routes.
   */
  static forRootAsync(options: NaelDevtoolsAsyncOptions): ClassType {
    // The armed decision resolves asynchronously at mount time, so capture boot
    // timing eagerly; it is simply unused if the guard later declines to arm.
    enableBootRecording();
    ensureDevtoolsIntegration();

    const providers: Provider[] = [asyncOptionsProvider(options)];
    if (options.useClass) {
      providers.push({ provide: options.useClass, useClass: options.useClass });
    }

    @Module({
      imports: options.imports ?? [],
      providers,
      exports: [DEVTOOLS_OPTIONS],
    })
    class NaelDevtoolsRootAsyncModule {}

    return NaelDevtoolsRootAsyncModule;
  }
}
