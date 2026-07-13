import 'reflect-metadata';

export {
  GraphqlApplication,
  createGraphqlApplication,
  createGraphqlApplicationFromContext,
  type GraphqlApplicationOptions,
  type GraphqlServerOptions,
  type GraphqlListenResult,
  type GraphqlContext,
  type GraphqlContextBase,
  type GraphqlContextFactory,
  type GraphqlExecuteParams,
  type GraphqlExecuteResult,
  type GraphqlSubscriptionsOptions,
} from './application';
export {
  FederationGatewayApplication,
  createFederationGatewayApplication,
  createFederationGatewayApplicationFromContext,
  type FederationGatewayApplicationOptions,
  type FederationGatewayServerOptions,
  type FederationGatewayListenOptions,
  type FederationGatewayListenResult,
  type FederationSubgraphDefinition,
  type FederationGatewayHttpRequestInit,
  isSubscriptionOperation,
} from './gateway-application';
export {
  GraphqlSchemaBuilder,
  type GraphqlBuildOptions,
  type GraphqlBuildArtifacts,
  type GraphqlFilterRuntimeOptions,
} from './schema-builder';
export {
  ObjectType,
  InputType,
  type ObjectTypeOptions,
  type FederationObjectOptions,
} from './decorators/object-type';
export { Field } from './decorators/field';
export { Subscription, type SubscriptionOptions } from './decorators/subscription';
export {
  type PubSub,
  type PubSubLogger,
  InMemoryPubSub,
  type InMemoryPubSubOptions,
  BoundedAsyncQueue,
} from './subscriptions/pubsub';
export { RedisPubSub, type RedisPubSubOptions } from './subscriptions/redis-pubsub';
export {
  createGraphqlWsHandlers,
  type GraphqlWsData,
  type GraphqlWsHandlersOptions,
} from './subscriptions/ws-transport';
export {
  mergeAsyncIterators,
  filterAsyncIterator,
} from './subscriptions/async-iterators';
export { GRAPHQL_PUBSUB } from './constants';
export {
  Resolver,
  Query,
  Mutation,
  ResolveField,
  ResolveReference,
  Arg,
  Args,
  Context,
  Parent,
  Info,
  createGraphqlParamDecorator,
} from './decorators/resolver';
export type {
  GraphqlParamDecoratorContext,
  GraphqlParamFactory,
} from './internal/metadata';
// Exposed for test harnesses that need to reset the process-global schema
// metadata between cases (see `@nl-framework/testing`).
export { GraphqlMetadataStorage } from './internal/metadata';
export { ID, Int, Float, BooleanScalar, StringScalar, DateTime, JSONScalar, GraphQLJSON, GraphQLDateTime } from './scalars';
export {
  registerScalarType,
  type RegisterScalarTypeOptions,
} from './register-scalar-type';
export {
  registerEnumType,
  type RegisterEnumTypeOptions,
  type RegisterEnumTypeValueOptions,
} from './register-enum-type';
export {
  registerGraphqlGuard,
  registerGraphqlGuards,
  listGraphqlGuards,
  clearGraphqlGuards,
} from './guards/registry';
export { createGraphqlGuardExecutionContext } from './guards/execution-context';
export type { GraphqlExecutionContext } from './guards/types';
export {
  registerGraphqlInterceptor,
  registerGraphqlInterceptors,
  listGraphqlInterceptors,
  clearGraphqlInterceptors,
} from './interceptors/registry';
export {
  createGraphqlInterceptorExecutionContext,
  type GraphqlInterceptorExecutionContext,
} from './interceptors/execution-context';
export type {
  GraphqlCallHandler,
  GraphqlInterceptor,
  GraphqlInterceptorFunction,
  GraphqlInterceptorInstance,
  GraphqlInterceptorToken,
} from './interceptors/types';
export {
  GraphqlCacheInterceptor,
  type GraphqlCacheInterceptorOptions,
} from './interceptors/cache.interceptor';
export {
  GraphqlSerializationInterceptor,
  type GraphqlSerializationInterceptorOptions,
} from './interceptors/serialization.interceptor';

// GraphQL exception filters
export type { GraphQLExceptionFilter } from './filters/graphql-exception-filter.interface';
export {
  registerGraphQLExceptionFilter,
  registerGraphQLExceptionFilters,
  listGraphQLExceptionFilters,
  clearGraphQLExceptionFilters,
} from './filters/registry';

// Re-export ApplicationException for convenience
export { ApplicationException, toGraphQLError, createGraphQLException } from '@nl-framework/core';
