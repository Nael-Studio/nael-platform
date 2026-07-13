import type { ClassType } from '@nl-framework/core';
import type { Logger } from '@nl-framework/logger';
import type { HttpRouteRegistrar, HttpRouteRegistrationApi } from '@nl-framework/http';
import {
  MessageDispatcher,
  isMicroserviceDropStatus,
} from '../dispatcher/message-dispatcher';
import type { RequestContextLike } from './request';
import { extractMetadata, unwrapEventPayload } from './request';
import { buildDaprSubscriptions, patternToRoute } from '../routing';

export interface MicroserviceRouteRegistrarOptions {
  /** Controllers whose `@MessagePattern`/`@EventPattern` handlers to expose. */
  controllers: ClassType[];
  /** Pub/sub component name advertised in the subscription document. */
  pubsubName: string;
  logger?: Logger;
}

/**
 * Builds an {@link HttpRouteRegistrar} that wires a microservice's handlers into
 * the HTTP server so a Dapr sidecar can drive them:
 * - `GET /dapr/subscribe` advertises one subscription per `@EventPattern`.
 * - `POST /_nl/msg/{pattern}` invokes each handler; message patterns return their
 *   result, event patterns return a Dapr `SUCCESS`/`DROP`/`RETRY` status.
 */
export const createMicroserviceRouteRegistrar = (
  options: MicroserviceRouteRegistrarOptions,
): HttpRouteRegistrar => {
  return async (api: HttpRouteRegistrationApi) => {
    const dispatcher = new MessageDispatcher({
      resolve: (token) => api.resolve(token),
      logger: options.logger ?? api.logger,
    });

    for (const Controller of options.controllers) {
      const instance = await api.resolve(Controller);
      dispatcher.registerController(instance as object);
    }

    const handlers = dispatcher.getHandlers();

    api.registerRoute('GET', '/dapr/subscribe', () =>
      buildDaprSubscriptions(handlers, { pubsubName: options.pubsubName }),
    );

    for (const handler of handlers) {
      const route = patternToRoute(handler.pattern);
      const { pattern, isEvent } = handler;

      api.registerRoute('POST', route, async (context: RequestContextLike) => {
        const metadata = extractMetadata(context.request.headers);
        const payload = isEvent ? unwrapEventPayload(context.body) : context.body;

        if (!isEvent) {
          // Request/response invocation: the result is the JSON body.
          return dispatcher.dispatch(pattern, payload, metadata);
        }

        // Pub/sub delivery: translate the outcome to Dapr's status contract so a
        // denied or failed event is dropped/retried rather than silently lost.
        try {
          const result = await dispatcher.dispatch(pattern, payload, metadata);
          if (isMicroserviceDropStatus(result)) {
            return result;
          }
          return { status: 'SUCCESS' };
        } catch (error) {
          options.logger?.error('Event handler failed; requesting retry', error, { pattern });
          return new Response(JSON.stringify({ status: 'RETRY' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      });
    }
  };
};
