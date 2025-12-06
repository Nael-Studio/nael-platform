import type { ClassType, ApplicationOptions, Token, ApplicationContext } from '@nl-framework/core';
import { Application } from '@nl-framework/core';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import { ApolloServer, HeaderMap } from '@apollo/server';
import type { HTTPGraphQLRequest, HTTPGraphQLResponse } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RequestContext } from '@nl-framework/http';
import { GraphqlSchemaBuilder, type GraphqlBuildOptions } from './schema-builder';
import { GRAPHQL_CONTAINER_RESOLVER } from './constants';
// Ensure built-in scalars (e.g., JSON) are registered even when this module is deep-imported.
import './scalars';

export interface GraphqlServerOptions {
  host?: string;
  port?: number;
  path?: string;
  federation?: GraphqlBuildOptions['federation'];
  context?: GraphqlContextFactory;
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

export class GraphqlApplication {
  private apolloServer?: ApolloServer<GraphqlContext>;
  private apolloServerStarted = false;
  private startPromise?: Promise<void>;
  private logger: Logger;
  private readonly unsubscribeModuleListener: () => void;

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

  async get<T>(token: Token<T>): Promise<T> {
    return this.context.get(token);
  }

  getConfig<TConfig extends Record<string, unknown>>() {
    return this.context.getConfig<TConfig>();
  }

  async close(): Promise<void> {
    if (this.startPromise) {
      await this.startPromise;
    }

    if (this.apolloServer) {
      await this.apolloServer.stop();
    }

    this.logger.info('GraphQL server stopped');
    this.unsubscribeModuleListener?.();

    if (this.ownsContext) {
      await this.context.close();
    }

    this.apolloServerStarted = false;
    this.apolloServer = undefined;
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
      });

      this.apolloServer = this.options.federation?.enabled
        ? new ApolloServer<GraphqlContext>({
          schema: buildSubgraphSchema({ typeDefs: artifacts.document, resolvers: artifacts.resolvers }),
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
