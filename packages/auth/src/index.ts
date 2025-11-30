export { BetterAuthModule } from './module';
export { BetterAuthService, type BetterAuthSessionOptions } from './service';
export { BetterAuthMultiTenantModule } from './multi-tenant.module';
export { BetterAuthMultiTenantService } from './multi-tenant.service';
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
	BETTER_AUTH_MULTI_TENANT_OPTIONS,
	registerGlobalPlugins,
	getGlobalPlugins,
	resetGlobalPlugins,
} from './constants';
export { BETTER_AUTH_HTTP_OPTIONS } from './http/constants';
export type {
	BetterAuthModuleOptions,
	BetterAuthModuleAsyncOptions,
	BetterAuthOptionsFactory,
} from './interfaces/module-options';
export type {
	BetterAuthMultiTenantOptions,
	BetterAuthMultiTenantModuleAsyncOptions,
	BetterAuthMultiTenantOptionsFactory,
	BetterAuthMultiTenantCacheOptions,
	BetterAuthTenantContext,
	BetterAuthTenantResolver,
	BetterAuthTenantResolution,
	BetterAuthTenantConfigLoader,
} from './interfaces/multi-tenant-options';
export type { BetterAuthInstance, BetterAuthSessionPayload } from './types';
export {
	createBetterAuthMiddleware,
	createBetterAuthMultiTenantMiddleware,
	getRequestAuth,
	setRequestAuth,
	clearRequestAuth,
} from './http/middleware';
export type { BetterAuthMiddlewareOptions, BetterAuthMultiTenantMiddlewareOptions } from './http/middleware';
export { BetterAuthHttpModule } from './http/http.module';
export type { BetterAuthHttpOptions } from './http/options';
export type { BetterAuthHttpAsyncOptions } from './http/http.module';
export {
	createBetterAuthRouteRegistrar,
	registerBetterAuthHttpRoutes,
	createBetterAuthMultiTenantRouteRegistrar,
	registerBetterAuthMultiTenantHttpRoutes,
} from './http/routes';
export { Public } from './http/public.decorator';
export {
	AuthGuard,
	MultiTenantAuthGuard,
	registerAuthGuard,
	resetAuthGuard,
	registerMultiTenantAuthGuard,
	resetMultiTenantAuthGuard,
} from './http/guard';
export * from './orm';
