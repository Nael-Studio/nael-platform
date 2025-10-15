import type { ApplicationOptions, ClassType, Token, ApplicationContext } from '@nl-framework/core';
import { Application } from '@nl-framework/core';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import { ApolloServer, HeaderMap } from '@apollo/server';
import type { HTTPGraphQLRequest } from '@apollo/server';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';

export interface FederationSubgraphDefinition {
  name: string;
  url: string;
}

export interface FederationGatewayServerOptions {
  host?: string;
  port?: number;
  path?: string;
  subgraphs?: FederationSubgraphDefinition[];
}

export interface FederationGatewayApplicationOptions
  extends ApplicationOptions,
    FederationGatewayServerOptions {}

export interface FederationGatewayListenResult {
  url: string;
}

export interface FederationGatewayListenOptions {
  host?: string;
  port?: number;
  path?: string;
  subgraphs?: FederationSubgraphDefinition[];
}

export interface FederationGatewayHttpRequestInit {
  method: string;
  headers: Headers;
  search: string;
  body?: unknown;
}

export class FederationGatewayApplication {
  private logger: Logger;
  private apolloServer?: ApolloServer;
  private gateway?: ApolloGateway;
  private server?: ReturnType<typeof Bun.serve>;
  private started = false;
  private subgraphs: FederationSubgraphDefinition[] = [];
  private httpIntegrated = false;
  private mountPath: string;

  constructor(
    private readonly context: ApplicationContext,
    private readonly options: FederationGatewayServerOptions,
    private readonly ownsContext: boolean,
  ) {
    const baseLogger = this.context.getLogger().child('FederationGateway');
    this.logger = baseLogger;
    this.mountPath = this.normalizePath(options.path ?? '/graphql');
    void this.context
      .get<LoggerFactory>(LoggerFactory)
      .then((factory) => {
        this.logger = factory.create({ context: 'FederationGateway' });
      })
      .catch(() => {
        this.logger = baseLogger;
      });
  }

  setHttpIntegration(path?: string): void {
    this.httpIntegrated = true;
    if (path) {
      this.mountPath = this.normalizePath(path);
    }
  }

  isHttpIntegrated(): boolean {
    return this.httpIntegrated;
  }

  getHttpIntegrationPath(): string {
    return this.mountPath;
  }

  async listen(options?: number | FederationGatewayListenOptions): Promise<FederationGatewayListenResult> {
    const listenOptions: FederationGatewayListenOptions =
      typeof options === 'number' ? { port: options } : options ?? {};
    const host = listenOptions.host ?? this.options.host ?? '0.0.0.0';
    const port = listenOptions.port ?? this.options.port ?? 4020;
  const path = this.normalizePath(listenOptions.path ?? this.mountPath);
  this.mountPath = path;
    const subgraphs = listenOptions.subgraphs ?? this.options.subgraphs ?? [];

    await this.start(subgraphs);

    if (!this.subgraphs.length) {
      throw new Error('Federation gateway requires at least one subgraph definition.');
    }

    if (this.server) {
      this.server.stop();
      this.server = undefined;
    }

    this.server = Bun.serve({
      hostname: host,
      port,
      fetch: async (request) => {
        const url = new URL(request.url);
        const requestedPath = url.pathname.length > 1 && url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
        if (requestedPath !== path) {
          return new Response('Not Found', { status: 404 });
        }

        const body = await this.extractBody(request);
        return this.execute({
          method: request.method,
          headers: request.headers,
          search: url.search,
          body,
        });
      },
    });

    const actualHost = this.server.hostname ?? host;
    const accessibleHost = actualHost === '0.0.0.0' ? 'localhost' : actualHost;
    const boundPort = this.server.port ?? port;
    const baseUrl = `http://${accessibleHost}:${boundPort}`;
    const url = path === '/' ? baseUrl : `${baseUrl}${path}`;

    this.logger.info(`Apollo Federation gateway started at ${url}`, {
      subgraphs: this.subgraphs.map((definition) => definition.url),
    });

    return { url };
  }

  async start(subgraphsOverride?: FederationSubgraphDefinition[]): Promise<void> {
    if (this.started) {
      if (subgraphsOverride && subgraphsOverride.length && this.hasDifferentSubgraphs(subgraphsOverride)) {
        this.logger.warn('Federation gateway already started; ignoring new subgraph definitions.');
      }
      return;
    }

    const subgraphs = subgraphsOverride ?? this.options.subgraphs ?? [];
    if (!subgraphs.length) {
      throw new Error('Federation gateway requires at least one subgraph definition.');
    }

    this.gateway = new ApolloGateway({
      supergraphSdl: new IntrospectAndCompose({
        subgraphs,
      }),
    });

    this.apolloServer = new ApolloServer({
      gateway: this.gateway,
    });

    await this.apolloServer.start();
    this.subgraphs = subgraphs;
    this.started = true;
    this.logger.info('Federation gateway prepared with subgraphs');
    this.subgraphs.map((definition) => {
      this.logger.info(`Subgraph included in gateway ${definition.url}`);
    });
  }

  async execute(request: FederationGatewayHttpRequestInit): Promise<Response> {
    await this.start();

    if (!this.apolloServer) {
      throw new Error('Apollo Server instance was not initialized.');
    }

    const headers = new HeaderMap();
    request.headers.forEach((value, key) => {
      headers.set(key, value);
    });

    const httpRequest: HTTPGraphQLRequest = {
      method: request.method,
      headers,
      search: request.search,
      body: request.body,
    };

    const { body, headers: responseHeaders, status } = await this.apolloServer.executeHTTPGraphQLRequest({
      httpGraphQLRequest: httpRequest,
      context: async () => ({}),
    });

    const headersObject = new Headers();
    for (const [key, value] of responseHeaders) {
      headersObject.set(key, value);
    }

    if (body.kind === 'complete') {
  const payload = body.string ?? '';
      return new Response(payload, {
        status,
        headers: headersObject,
      });
    }

    const stream = new ReadableStream<Uint8Array | string>({
      async start(controller) {
        try {
          for await (const chunk of body.asyncIterator) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      status,
      headers: headersObject,
    });
  }

  async close(): Promise<void> {
    const errors: Error[] = [];

    this.server?.stop();

    if (this.apolloServer) {
      try {
        await this.apolloServer.stop();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (this.gateway) {
      try {
        await this.gateway.stop();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.logger.info('Federation gateway server stopped');
    this.started = false;
  this.apolloServer = undefined;
  this.gateway = undefined;
  this.subgraphs = [];

    if (this.ownsContext) {
      try {
        await this.context.close();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (errors.length) {
      throw new AggregateError(errors, 'One or more errors occurred while stopping the federation gateway');
    }
  }

  async get<T>(token: Token<T>): Promise<T> {
    return this.context.get(token);
  }

  getConfig<TConfig extends Record<string, unknown>>() {
    return this.context.getConfig<TConfig>();
  }

  getLogger(): Logger {
    return this.logger;
  }

  getHttpIntegrationUrl(server: ReturnType<typeof Bun.serve>): string {
    const mountPath = this.mountPath;
    const hostname = server.hostname ?? '0.0.0.0';
    const accessibleHost = hostname === '0.0.0.0' ? 'localhost' : hostname;
    const baseUrl = `http://${accessibleHost}:${server.port}`;
    return mountPath === '/' ? baseUrl : `${baseUrl}${mountPath}`;
  }

  private async extractBody(request: Request): Promise<unknown> {
    if (request.method === 'GET' || request.method === 'HEAD') {
      return undefined;
    }

    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      try {
        return await request.json();
      } catch {
        return await request.text();
      }
    }

    if (contentType.includes('application/graphql')) {
      return await request.text();
    }

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      return Object.fromEntries(formData.entries());
    }

    return await request.text();
  }

  private normalizePath(path: string): string {
    if (!path.startsWith('/')) {
      return `/${path}`;
    }
    if (path.length > 1 && path.endsWith('/')) {
      return path.slice(0, -1);
    }
    return path;
  }

  private hasDifferentSubgraphs(next: FederationSubgraphDefinition[]): boolean {
    if (this.subgraphs.length !== next.length) {
      return true;
    }

    const serialize = (definition: FederationSubgraphDefinition) => `${definition.name}|${definition.url}`;
    const existing = new Set(this.subgraphs.map(serialize));
    return next.some((definition) => !existing.has(serialize(definition)));
  }
}

export const createFederationGatewayApplication = async (
  rootModule: ClassType,
  options: FederationGatewayApplicationOptions,
): Promise<FederationGatewayApplication> => {
  const { config, logger, ...serverOptions } = options;
  const app = new Application();
  const context = await app.bootstrap(rootModule, { config, logger });
  return new FederationGatewayApplication(context, serverOptions, true);
};

export const createFederationGatewayApplicationFromContext = (
  context: ApplicationContext,
  options: FederationGatewayServerOptions = {},
): FederationGatewayApplication => new FederationGatewayApplication(context, options, false);
