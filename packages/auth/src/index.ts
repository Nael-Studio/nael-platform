import 'reflect-metadata';

export { AuthModule } from './module';
export { BetterAuthService } from './better-auth.service';
export { InMemoryBetterAuth } from './fallback-adapter';
export type {
  BetterAuthModuleOptions,
  BetterAuthModuleAsyncOptions,
  BetterAuthModuleOptionsFactory,
  BetterAuthAdapter,
  BetterAuthPlugin,
  BetterAuthSession,
  BetterAuthUser,
  BetterAuthUserInput,
  SignInCredentials,
  AuthorizationRequirements,
} from './interfaces';
export { BETTER_AUTH_INSTANCE, BETTER_AUTH_OPTIONS } from './tokens';
