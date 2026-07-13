import 'reflect-metadata';
import type { ClassType } from '@nl-framework/core';
import {
  GraphqlMetadataStorage,
  type ResolverMethodOptions,
  type SubscriptionConfig,
  type SubscriptionTopic,
  type TypeThunk,
} from '../internal/metadata';

const storage = GraphqlMetadataStorage.get();

export interface SubscriptionOptions extends ResolverMethodOptions {
  /** Single topic the subscription listens on. */
  topic?: SubscriptionTopic;
  /** Multiple topics — merged into one stream. Alias-friendly alternative to `topic`. */
  topics?: SubscriptionTopic;
  /** Skip payloads that fail this predicate for the current subscriber. */
  filter?: SubscriptionConfig['filter'];
  /** Map the raw published payload to the resolved field value. Defaults to identity. */
  resolve?: SubscriptionConfig['resolve'];
}

/**
 * Declares a GraphQL subscription resolver. The decorated method's arguments are
 * collected like a query's; the field's `subscribe` streams from the configured
 * pub/sub topic(s), optionally filtered and mapped.
 *
 * ```ts
 * @Subscription(() => Order, {
 *   topic: 'order.created',
 *   filter: (payload, args, ctx) => payload.tenantId === ctx.tenantId,
 *   resolve: (payload) => payload.order,
 * })
 * orderCreated(@Arg('tenantId') tenantId: string) {}
 * ```
 */
export const Subscription = (
  typeThunk?: TypeThunk,
  options: SubscriptionOptions = {},
): MethodDecorator => (target, propertyKey) => {
  const { topic, topics, filter, resolve, ...methodOptions } = options;
  const resolvedTopics = topics ?? topic;
  if (resolvedTopics === undefined) {
    throw new Error(
      `@Subscription on ${(target as { constructor: { name: string } }).constructor.name}.${String(propertyKey)} requires a "topic" or "topics".`,
    );
  }

  const designReturnType = Reflect.getMetadata('design:returntype', target, propertyKey);
  storage.addResolverMethod({
    kind: 'subscription',
    target: (target as { constructor: ClassType }).constructor,
    methodName: String(propertyKey),
    schemaName: methodOptions.name ?? String(propertyKey),
    typeThunk,
    designReturnType,
    options: methodOptions,
    subscription: { topics: resolvedTopics, filter, resolve },
  });
};
