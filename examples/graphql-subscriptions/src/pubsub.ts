import { InMemoryPubSub } from '@nl-framework/graphql';

/**
 * A single process-wide pub/sub shared between the mutation (publisher) and the
 * subscription (consumer). In production you would register a `RedisPubSub`
 * under the `GRAPHQL_PUBSUB` token instead so it fans out across instances.
 */
export const pubsub = new InMemoryPubSub();

export const messageTopic = (room: string): string => `chat.${room}`;
