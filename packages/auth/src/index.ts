export { BetterAuthModule } from './module';
export { BetterAuthService, type BetterAuthSessionOptions } from './service';
export {
	BETTER_AUTH_INSTANCE,
	BETTER_AUTH_OPTIONS,
	BETTER_AUTH_ADAPTER,
	registerGlobalPlugins,
	getGlobalPlugins,
	resetGlobalPlugins,
} from './constants';
export type {
	BetterAuthModuleOptions,
	BetterAuthModuleAsyncOptions,
	BetterAuthOptionsFactory,
} from './interfaces/module-options';
export type { BetterAuthInstance, BetterAuthSessionPayload } from './types';
export {
	createBetterAuthMiddleware,
	getRequestAuth,
	setRequestAuth,
	clearRequestAuth,
} from './http/middleware';
export type { BetterAuthMiddlewareOptions } from './http/middleware';
export * from './orm';
