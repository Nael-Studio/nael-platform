import { Module, type ClassType, type Provider, type Token } from '@nl-framework/core';
import { registerHttpRouteRegistrar } from '@nl-framework/http';
import { BetterAuthService } from '../service';
import { BETTER_AUTH_HTTP_OPTIONS } from './constants';
import {
  normalizeBetterAuthHttpOptions,
  type BetterAuthHttpOptions,
  type NormalizedBetterAuthHttpOptions,
} from './options';
import { createBetterAuthRouteRegistrar } from './routes';
import { AuthGuard, registerAuthGuard } from './guard';

let betterAuthHttpRouteRegistrarRegistered = false;

const ensureBetterAuthHttpIntegration = (): void => {
  registerAuthGuard();

  if (betterAuthHttpRouteRegistrarRegistered) {
    return;
  }

  betterAuthHttpRouteRegistrarRegistered = true;

  registerHttpRouteRegistrar(async (api) => {
    const [authService, options] = await Promise.all([
      api.resolve(BetterAuthService),
      api.resolve<NormalizedBetterAuthHttpOptions>(BETTER_AUTH_HTTP_OPTIONS),
    ]);

    const registrar = createBetterAuthRouteRegistrar(authService, options);
    await registrar(api);
  });
};

const createOptionsProvider = (options?: BetterAuthHttpOptions): Provider => ({
  provide: BETTER_AUTH_HTTP_OPTIONS,
  useValue: normalizeBetterAuthHttpOptions(options),
});

export interface BetterAuthHttpAsyncOptions {
  imports?: ClassType[];
  inject?: Token[];
  useFactory: (...args: unknown[]) => BetterAuthHttpOptions | Promise<BetterAuthHttpOptions | undefined> | undefined;
}

const createAsyncOptionsProvider = (options: BetterAuthHttpAsyncOptions): Provider => ({
  provide: BETTER_AUTH_HTTP_OPTIONS,
  useFactory: async (...args: unknown[]) => {
    const resolved = options.useFactory ? await options.useFactory(...args) : undefined;
    return normalizeBetterAuthHttpOptions(resolved);
  },
  inject: options.inject ?? [],
});

export class BetterAuthHttpModule {
  static register(options?: BetterAuthHttpOptions): ClassType {
    ensureBetterAuthHttpIntegration();

    @Module({
      providers: [createOptionsProvider(options), AuthGuard],
      exports: [BETTER_AUTH_HTTP_OPTIONS],
    })
    class BetterAuthHttpFeatureModule {}

    return BetterAuthHttpFeatureModule;
  }

  static registerAsync(options: BetterAuthHttpAsyncOptions): ClassType {
    if (!options.useFactory) {
      throw new Error('BetterAuthHttpModule.registerAsync requires a useFactory function.');
    }

    ensureBetterAuthHttpIntegration();

    @Module({
      imports: options.imports ?? [],
      providers: [createAsyncOptionsProvider(options), AuthGuard],
      exports: [BETTER_AUTH_HTTP_OPTIONS],
    })
    class BetterAuthHttpAsyncModule {}

    return BetterAuthHttpAsyncModule;
  }
}
