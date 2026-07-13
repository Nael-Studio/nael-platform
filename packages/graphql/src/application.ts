import type { ClassType, ApplicationOptions, Token, ApplicationContext } from '@nl-framework/core';
import { Application } from '@nl-framework/core';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import { ApolloServer, HeaderMap } from '@apollo/server';
import type { HTTPGraphQLRequest, HTTPGraphQLResponse } from '@apollo/server';
import type { GraphQLFormattedError, GraphQLSchema } from 'graphql';
import { buildSubgraphSchema } from '@apollo/subgraph';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RequestContext } from '@nl-framework/http';
import { GraphqlSchemaBuilder, type GraphqlBuildOptions } from './schema-builder';
import { GRAPHQL_CONTAINER_RESOLVER, GRAPHQL_PUBSUB } from './constants';
import type { WebSocketHandler } from 'bun';
import { InMemoryPubSub, type PubSub } from './subscriptions/pubsub';
import { createGraphqlWsHandlers, type GraphqlWsData } from './subscriptions/ws-transport';
// Ensure built-in scalars (e.g., JSON) are registered even when this module is deep-imported.
import './scalars';

export interface GraphqlSubscriptionsOptions {
  /** WebSocket upgrade path. Defaults to the GraphQL HTTP path. */
  path?: string;
  /**
   * Runs on `connection_init`. Return `false` to reject the socket, or an object
   * merged into the connection context (do Better Auth session lookup here).
   */
  onConnect?: (ctx: {
    connectionParams?: Record<string, unknown>;
    request: Request;
  }) => boolean | Record<string, unknown> | Promise<boolean | Record<string, unknown>>;
}

export interface GraphqlServerOptions {
  host?: string;
  port?: number;
  path?: string;
  federation?: GraphqlBuildOptions['federation'];
  context?: GraphqlContextFactory;
  /** Pub/sub backing `@Subscription()`. Falls back to the `GRAPHQL_PUBSUB` provider, then in-memory. */
  pubsub?: PubSub;
  /** Enable `graphql-ws` subscriptions on `listen()` (`true` or config). */
  subscriptions?: boolean | GraphqlSubscriptionsOptions;
}

export interface GraphqlApplicationOptions extends ApplicationOptions, GraphqlServerOptions { }

export interface GraphqlListenResult {
  url: string;
}

export interface GraphqlContextBase {
  req: IncomingMessage;
  res: ServerResponse<IncomingMessage>;
}

export type GraphqlContext = GraphqlContextBase & Record<string, unknown>;

export type GraphqlContextFactory = (
  params: GraphqlContextBase,
) => Promise<Record<string, unknown>> | Record<string, unknown>;

export interface GraphqlExecuteParams {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
  /** Extra values merged onto the GraphQL context (after any configured context factory). */
  contextValue?: Record<string, unknown>;
  /** Header map exposed to the node-like request stub for context factories. */
  headers?: Record<string, string | string[]>;
}

export interface GraphqlExecuteResult<TData = Record<string, unknown>> {
  data: TData | null;
  errors?: GraphQLFormattedError[];
  extensions?: Record<string, unknown>;
}

export class GraphqlApplication {
  private apolloServer?: ApolloServer<GraphqlContext>;
  private apolloServerStarted = false;
  private startPromise?: Promise<void>;
  private logger: Logger;
  private readonly unsubscribeModuleListener: () => void;
  private pubsub?: PubSub;
  private executableSchema?: GraphQLSchema;
  private wsServer?: ReturnType<typeof Bun.serve>;

  constructor(
    private readonly context: ApplicationContext,
    private readonly options: GraphqlServerOptions,
    private readonly ownsContext: boolean,
  ) {
    const baseLogger = this.context.getLogger().child('GraphqlApplication');
    this.logger = baseLogger;
    void this.context
      .get<LoggerFactory>(LoggerFactory)
      .then((factory) => {
        this.logger = factory.create({ context: 'GraphqlApplication' });
      })
      .catch(() => {
        /* noop */
      });

    const resolverCount = this.context.getResolvers().length;
    this.logger.info(`GraphQL module loaded (resolvers=${resolverCount})`);

    this.unsubscribeModuleListener = this.context.addModuleLoadListener(async ({ module }) => {
      await this.invalidateSchema(module.name ?? 'AnonymousModule');
    });
  }

  async createHttpHandler(path = this.options.path ?? '/graphql'): Promise<(ctx: RequestContext) => Promise<Response>> {
    const normalizedPath = this.normalizePath(path);

    return async (ctx: RequestContext): Promise<Response> => {
      const server = await this.ensureApolloServer({ start: true });
      const requestUrl = new URL(ctx.request.url);
      if (requestUrl.pathname !== normalizedPath) {
        return new Response('Not Found', { status: 404 });
      }

      const httpRequest = await this.createHttpGraphqlRequest(ctx, requestUrl);
      const nodeLikeRequest = this.createNodeIncomingRequest(ctx, requestUrl);
      const responseStub = this.createServerResponseStub();
      const baseContext: GraphqlContext = {
        req: nodeLikeRequest,
        res: responseStub,
        request: ctx.request,
      };

      if (this.options.context) {
        const extra = await this.options.context({ req: nodeLikeRequest, res: baseContext.res });
        if (extra && typeof extra === 'object') {
          Object.assign(baseContext, extra);
        }
      }

      Reflect.set(baseContext as object, GRAPHQL_CONTAINER_RESOLVER, ctx.container.resolve);

      const response = await server.executeHTTPGraphQLRequest({
        httpGraphQLRequest: httpRequest,
        context: async () => baseContext,
      });

      return this.toResponse(response);
    };
  }

  /**
   * Execute a GraphQL operation in-process via Apollo's `executeOperation`, with
   * no HTTP server or port. The framework's scoped container resolver is attached
   * to the context so guards, interceptors, and field resolvers run exactly as
   * they would over HTTP. Intended for `@nl-framework/testing`.
   */
  async execute<TData = Record<string, unknown>>(
    params: GraphqlExecuteParams,
  ): Promise<GraphqlExecuteResult<TData>> {
    const server = await this.ensureApolloServer({ start: true });

    const nodeLikeRequest = {
      headers: params.headers ?? {},
      method: 'POST',
      url: this.normalizePath(this.options.path ?? '/graphql'),
    } as unknown as IncomingMessage;

    const baseContext: GraphqlContext = {
      req: nodeLikeRequest,
      res: this.createServerResponseStub(),
    };

    if (this.options.context) {
      const extra = await this.options.context({ req: nodeLikeRequest, res: baseContext.res });
      if (extra && typeof extra === 'object') {
        Object.assign(baseContext, extra);
      }
    }

    if (params.contextValue && typeof params.contextValue === 'object') {
      Object.assign(baseContext, params.contextValue);
    }

    Reflect.set(baseContext as object, GRAPHQL_CONTAINER_RESOLVER, <T>(token: Token<T>) =>
      this.context.get(token),
    );

    const response = await server.executeOperation(
      {
        query: params.query,
        variables: params.variables,
        operationName: params.operationName,
      },
      { contextValue: baseContext },
    );

    if (response.body.kind === 'single') {
      const result = response.body.singleResult;
      return {
        data: (result.data ?? null) as TData | null,
        errors: result.errors ? [...result.errors] : undefined,
        extensions: result.extensions,
      };
    }

    // Incremental delivery (@defer/@stream) collapses to its initial payload here.
    const initial = response.body.initialResult;
    return {
      data: (initial.data ?? null) as TData | null,
      errors: initial.errors ? [...initial.errors] : undefined,
      extensions: initial.extensions,
    };
  }

  async get<T>(token: Token<T>): Promise<T> {
    return this.context.get(token);
  }

  getConfig<TConfig extends Record<string, unknown>>() {
    return this.context.getConfig<TConfig>();
  }

  /** Resolve the pub/sub: explicit option → `GRAPHQL_PUBSUB` provider → in-memory. */
  private async resolvePubSub(): Promise<PubSub> {
    if (this.pubsub) {
      return this.pubsub;
    }
    if (this.options.pubsub) {
      this.pubsub = this.options.pubsub;
      return this.pubsub;
    }
    try {
      const provided = await this.context.get<PubSub>(GRAPHQL_PUBSUB as unknown as Token<PubSub>);
      if (provided) {
        this.pubsub = provided;
        return provided;
      }
    } catch {
      // No provider registered — fall back to in-memory.
    }
    this.pubsub = new InMemoryPubSub();
    return this.pubsub;
  }

  private async buildRequestContext(request: Request): Promise<RequestContext> {
    let body: unknown;
    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
      const contentType = request.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        body = await request.json().catch(() => ({}));
      } else {
        body = await request.text();
      }
    }
    return {
      request,
      params: {},
      query: new URL(request.url).searchParams,
      headers: request.headers,
      body,
      route: {
        controller: GraphqlApplication as unknown as ClassType,
        handlerName: 'graphql',
        definition: { method: 'POST', path: this.normalizePath(this.options.path ?? '/graphql'), handlerName: 'graphql' },
      },
      container: { resolve: <T>(token: Token<T>) => this.context.get(token) },
    } as unknown as RequestContext;
  }

  /**
   * Bind a Bun server that serves GraphQL over HTTP and — when `subscriptions`
   * is enabled — upgrades `graphql-transport-ws` WebSocket connections on the
   * same port. Returns the public URL.
   */
  async listen(port = this.options.port ?? 4000): Promise<GraphqlListenResult> {
    await this.ensureApolloServer({ start: true });
    const httpHandler = await this.createHttpHandler();

    const subsConfig = this.options.subscriptions;
    const subsEnabled = Boolean(subsConfig);
    const subsPath = this.normalizePath(
      (typeof subsConfig === 'object' ? subsConfig.path : undefined) ?? this.options.path ?? '/graphql',
    );
    const onConnect = typeof subsConfig === 'object' ? subsConfig.onConnect : undefined;

    const ws =
      subsEnabled && this.executableSchema
        ? createGraphqlWsHandlers({
          schema: this.executableSchema,
          onConnect,
          buildContext: async (connectionContext) => {
            const base = { ...connectionContext };
            Reflect.set(base, GRAPHQL_CONTAINER_RESOLVER, <T>(token: Token<T>) => this.context.get(token));
            return base;
          },
        })
        : undefined;

    const host = this.options.host ?? '0.0.0.0';
    const self = this;

    const websocket: WebSocketHandler<GraphqlWsData> = ws?.websocket ?? {
      open(socket) {
        socket.close(1011, 'GraphQL subscriptions are not enabled');
      },
      message() {},
      close() {},
    };

    this.wsServer = Bun.serve<GraphqlWsData, undefined>({
      port,
      hostname: host,
      async fetch(request, server) {
        if (ws && (request.headers.get('upgrade') ?? '').toLowerCase() === 'websocket') {
          const url = new URL(request.url);
          if (self.normalizePath(url.pathname) === subsPath) {
            // Bun auto-negotiates the WebSocket subprotocol from the request;
            // setting `Sec-WebSocket-Protocol` here would break that handshake.
            const upgraded = server.upgrade(request, {
              data: ws.upgradeData(request),
            });
            if (upgraded) {
              return undefined;
            }
            return new Response('WebSocket upgrade failed', { status: 400 });
          }
        }
        return httpHandler(await self.buildRequestContext(request));
      },
      websocket,
    });

    const accessibleHost = host === '0.0.0.0' ? 'localhost' : host;
    const url = `http://${accessibleHost}:${this.wsServer.port}${subsPath}`;
    this.logger.info(
      `GraphQL server listening at ${url}${subsEnabled ? ' (graphql-ws subscriptions enabled)' : ''}`,
    );
    return { url };
  }

  async close(): Promise<void> {
    if (this.startPromise) {
      await this.startPromise;
    }

    if (this.wsServer) {
      // Graceful shutdown: close all sockets with 1001 (going away).
      this.wsServer.stop();
      this.wsServer = undefined;
    }

    if (this.apolloServer) {
      await this.apolloServer.stop();
    }

    if (this.pubsub?.close) {
      await this.pubsub.close().catch(() => undefined);
    }

    this.logger.info('GraphQL server stopped');
    this.unsubscribeModuleListener?.();

    if (this.ownsContext) {
      await this.context.close();
    }

    this.apolloServerStarted = false;
    this.apolloServer = undefined;
    this.executableSchema = undefined;
    this.startPromise = undefined;
  }

  private async ensureApolloServer({ start }: { start: boolean }): Promise<ApolloServer<GraphqlContext>> {
    if (!this.apolloServer) {
      const builder = new GraphqlSchemaBuilder();
      const resolvers = this.context.getResolvers();
      const artifacts = builder.build(resolvers, {
        federation: this.options.federation,
        guards: {
          resolve: <T>(token: Token<T>) => this.context.get(token),
        },
        interceptors: {
          resolve: <T>(token: Token<T>) => this.context.get(token),
        },
        pubsub: await this.resolvePubSub(),
      });

      // The executable schema (used by the graphql-ws subscription transport) is
      // always built from the subgraph builder so `subscribe` resolvers are wired.
      this.executableSchema = buildSubgraphSchema({
        typeDefs: artifacts.document,
        resolvers: artifacts.resolvers,
      });

      this.apolloServer = this.options.federation?.enabled
        ? new ApolloServer<GraphqlContext>({
          schema: this.executableSchema,
        })
        : new ApolloServer<GraphqlContext>({
          typeDefs: artifacts.document,
          resolvers: artifacts.resolvers,
        });
    }

    if (start && !this.apolloServerStarted) {
      if (!this.startPromise) {
        this.startPromise = this.apolloServer.start().then(() => {
          this.apolloServerStarted = true;
          this.startPromise = undefined;
        });
      }
      await this.startPromise;
    }

    return this.apolloServer;
  }

  private async invalidateSchema(moduleName: string): Promise<void> {
    if (!this.apolloServer) {
      return;
    }

    if (this.startPromise) {
      await this.startPromise;
    }

    if (this.apolloServerStarted) {
      await this.apolloServer.stop();
    }

    this.apolloServer = undefined;
    this.apolloServerStarted = false;
    this.startPromise = undefined;
    this.logger.info('GraphQL schema invalidated after module load', { module: moduleName });
  }

  private normalizePath(path: string): string {
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }
    if (path.length > 1 && path.endsWith('/')) {
      return path.slice(0, -1);
    }
    return path;
  }

  private async createHttpGraphqlRequest(ctx: RequestContext, url: URL): Promise<HTTPGraphQLRequest> {
    const headers = new HeaderMap();
    ctx.request.headers.forEach((value, key) => {
      headers.set(key, value);
    });

    const body = await this.resolveRequestBody(ctx.body);

    return {
      method: ctx.request.method,
      headers,
      search: url.search,
      body,
    } satisfies HTTPGraphQLRequest;
  }

  private async resolveRequestBody(body: unknown): Promise<unknown> {
    if (body instanceof Promise) {
      return body.then((value) => this.normalizeRequestBody(value));
    }
    return this.normalizeRequestBody(body);
  }

  private normalizeRequestBody(body: unknown): unknown {
    if (body instanceof ArrayBuffer) {
      return new TextDecoder().decode(body);
    }
    return body ?? null;
  }

  private createNodeIncomingRequest(ctx: RequestContext, url: URL): IncomingMessage {
    const headers: Record<string, string | string[]> = {};
    ctx.request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const requestLike = {
      headers,
      method: ctx.request.method,
      url: `${url.pathname}${url.search}`,
    } as unknown as IncomingMessage;

    return requestLike;
  }

  private createServerResponseStub(): ServerResponse<IncomingMessage> {
    const headerStore = new Map<string, string>();

    const stub: Partial<ServerResponse<IncomingMessage>> & {
      statusCode: number;
      statusMessage: string;
    } = Object.assign(Object.create(null), {
      statusCode: 200,
      statusMessage: 'OK',
      setHeader(name: string, value: number | string | readonly string[]) {
        headerStore.set(name.toLowerCase(), Array.isArray(value) ? value.join(', ') : String(value));
        return stub;
      },
      getHeader(name: string) {
        return headerStore.get(name.toLowerCase()) ?? undefined;
      },
      getHeaders() {
        return Object.fromEntries(headerStore.entries());
      },
      hasHeader(name: string) {
        return headerStore.has(name.toLowerCase());
      },
      removeHeader(name: string) {
        headerStore.delete(name.toLowerCase());
      },
      writeHead(statusCode: number, arg?: unknown) {
        stub.statusCode = statusCode;
        if (typeof arg === 'string') {
          stub.statusMessage = arg;
        }
        return stub;
      },
      end() {
        return stub;
      },
      write() {
        return true;
      },
    });

    return stub as ServerResponse<IncomingMessage>;
  }

  private toResponse(httpResponse: HTTPGraphQLResponse): Response {
    const headers = new Headers();
    httpResponse.headers.forEach((value, key) => {
      headers.set(key, value);
    });

    const status = httpResponse.status ?? 200;

    if (httpResponse.body.kind === 'complete') {
      return new Response(httpResponse.body.string, {
        status,
        headers,
      });
    }

    const iterator = httpResponse.body.asyncIterator;
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { value, done } = await iterator.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(new TextEncoder().encode(value));
      },
      async cancel(reason) {
        if (iterator.return) {
          try {
            await iterator.return(reason);
          } catch {
            /* ignore */
          }
        }
      },
    });

    return new Response(stream, {
      status,
      headers,
    });
  }
}

export const createGraphqlApplication = async (
  rootModule: ClassType,
  options: GraphqlApplicationOptions = {},
): Promise<GraphqlApplication> => {
  const { config, logger, ...serverOptions } = options;
  const app = new Application();
  const context = await app.bootstrap(rootModule, { config, logger });
  return new GraphqlApplication(context, serverOptions, true);
};

export const createGraphqlApplicationFromContext = (
  context: ApplicationContext,
  options: GraphqlServerOptions = {},
): GraphqlApplication => new GraphqlApplication(context, options, false);
