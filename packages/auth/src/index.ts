export { BetterAuthModule } from './module';
export { BetterAuthService, type BetterAuthSessionOptions } from './service';
export { BetterAuthGraphqlModule } from './graphql/module';
export {
	AuthUser,
	AuthSession,
	AuthMutationResult,
	SignInEmailInput,
	SignUpEmailInput,
} from './graphql/types';
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
export { BetterAuthHttpModule } from './http/http.module';
export type { BetterAuthHttpOptions } from './http/options';
export type { BetterAuthHttpAsyncOptions } from './http/http.module';
export { Public } from './http/public.decorator';
export { AuthGuard, registerAuthGuard, resetAuthGuard } from './http/guard';
export * from './orm';
