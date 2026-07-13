import type { WebSocketHandler, ServerWebSocket } from 'bun';
import type { ExecutionArgs, GraphQLSchema } from 'graphql';
import { execute, subscribe } from 'graphql';
import { makeServer, type ServerOptions, GRAPHQL_TRANSPORT_WS_PROTOCOL } from 'graphql-ws';

/** Per-connection state carried on Bun's `ServerWebSocket.data`. */
export interface GraphqlWsData {
  protocol: string;
  request: Request;
  onMessage?: (data: string) => Promise<void>;
  closed?: (code: number, reason: string) => void | Promise<void>;
}

export interface GraphqlWsHandlersOptions {
  schema: GraphQLSchema;
  /**
   * Runs on `connection_init`. Return `false` to reject, or an object merged into
   * the connection context (surface Better Auth session lookup here for auth).
   */
  onConnect?: (ctx: {
    connectionParams?: Record<string, unknown>;
    request: Request;
  }) => boolean | Record<string, unknown> | Promise<boolean | Record<string, unknown>>;
  /** Build the per-operation GraphQL context. Receives the connection context. */
  buildContext?: (connectionContext: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>;
}

/**
 * Build Bun WebSocket handlers that speak the `graphql-transport-ws` protocol,
 * bridging Bun's socket lifecycle to graphql-ws's transport-agnostic server core.
 *
 * `upgradeData(request)` produces the `data` payload to pass to `server.upgrade`.
 */
export const createGraphqlWsHandlers = (
  options: GraphqlWsHandlersOptions,
): {
  websocket: WebSocketHandler<GraphqlWsData>;
  upgradeData: (request: Request) => GraphqlWsData;
  protocol: string;
} => {
  const serverOptions: ServerOptions<Record<string, unknown>, { request: Request }> = {
    schema: options.schema,
    execute: (args: ExecutionArgs) => execute(args),
    subscribe: (args: ExecutionArgs) => subscribe(args),
    onConnect: async (ctx) => {
      if (!options.onConnect) {
        return true;
      }
      const request = ctx.extra.request;
      const result = await options.onConnect({
        connectionParams: ctx.connectionParams as Record<string, unknown> | undefined,
        request,
      });
      if (result === false) {
        return false;
      }
      if (result && typeof result === 'object') {
        Object.assign(ctx.extra as Record<string, unknown>, result);
      }
      return true;
    },
    context: async (ctx) => {
      const connectionContext = ctx.extra as unknown as Record<string, unknown>;
      if (options.buildContext) {
        return options.buildContext(connectionContext);
      }
      return connectionContext;
    },
  };

  const gqlServer = makeServer(serverOptions);

  const websocket: WebSocketHandler<GraphqlWsData> = {
    open(ws: ServerWebSocket<GraphqlWsData>) {
      const closed = gqlServer.opened(
        {
          protocol: ws.data.protocol,
          send: (data) => {
            ws.send(data);
          },
          close: (code, reason) => {
            ws.close(code, reason);
          },
          onMessage: (cb) => {
            ws.data.onMessage = cb;
          },
        },
        { request: ws.data.request },
      );
      ws.data.closed = closed;
    },
    async message(ws: ServerWebSocket<GraphqlWsData>, message) {
      const text = typeof message === 'string' ? message : message.toString();
      await ws.data.onMessage?.(text);
    },
    close(ws: ServerWebSocket<GraphqlWsData>, code, reason) {
      void ws.data.closed?.(code ?? 1000, reason ?? '');
    },
  };

  return {
    websocket,
    protocol: GRAPHQL_TRANSPORT_WS_PROTOCOL,
    upgradeData: (request: Request): GraphqlWsData => ({
      protocol: request.headers.get('sec-websocket-protocol') ?? GRAPHQL_TRANSPORT_WS_PROTOCOL,
      request,
    }),
  };
};
