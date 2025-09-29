import {
  Inject,
  Injectable,
  Module,
  type ClassType,
  type Provider,
  type Token,
} from '@nl-framework/core';
import { LoggerFactory } from '@nl-framework/logger';
import type { OnModuleInit } from '@nl-framework/core';
import { BetterAuthService } from '../service';
import { BETTER_AUTH_HTTP_OPTIONS } from './constants';
import {
  normalizeBetterAuthHttpOptions,
  type BetterAuthHttpOptions,
  type NormalizedBetterAuthHttpOptions,
} from './options';
import { registerBetterAuthHttpRoutes } from './routes';

@Injectable()
class BetterAuthHttpRegistrar implements OnModuleInit {
  constructor(
    private readonly authService: BetterAuthService,
    private readonly loggerFactory: LoggerFactory,
    @Inject(BETTER_AUTH_HTTP_OPTIONS) private readonly httpOptions: NormalizedBetterAuthHttpOptions,
  ) {}

  onModuleInit(): void {
    registerBetterAuthHttpRoutes(this.authService, this.httpOptions);
    const logger = this.loggerFactory.create({ context: 'BetterAuthHttpRegistrar' });
    logger.info('Configured Better Auth HTTP integration', {
      prefix: this.httpOptions.prefix,
      handleOptions: this.httpOptions.handleOptions,
    });
  }
}

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
    @Module({
      providers: [createOptionsProvider(options), BetterAuthHttpRegistrar],
      exports: [BETTER_AUTH_HTTP_OPTIONS],
    })
    class BetterAuthHttpFeatureModule {}

    return BetterAuthHttpFeatureModule;
  }

  static registerAsync(options: BetterAuthHttpAsyncOptions): ClassType {
    if (!options.useFactory) {
      throw new Error('BetterAuthHttpModule.registerAsync requires a useFactory function.');
    }

    @Module({
      imports: options.imports ?? [],
      providers: [createAsyncOptionsProvider(options), BetterAuthHttpRegistrar],
      exports: [BETTER_AUTH_HTTP_OPTIONS],
    })
    class BetterAuthHttpAsyncModule {}

    return BetterAuthHttpAsyncModule;
  }
}
