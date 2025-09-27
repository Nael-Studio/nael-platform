import type { Server } from 'bun';
import type {
  ApplicationOptions,
  ClassType,
  Token,
  ApplicationContext,
} from '@nl-framework/core';
import { Application } from '@nl-framework/core';
import type { ConfigService } from '@nl-framework/core';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import {
  createHttpApplicationFromContext,
  type HttpApplication,
  type HttpServerOptions,
} from '@nl-framework/http';
import {
  createGraphqlApplicationFromContext,
  type GraphqlApplication,
  type GraphqlServerOptions,
  type GraphqlListenResult,
} from '@nl-framework/graphql';

interface NormalizedHttpOptions {
  enabled: boolean;
  options: HttpServerOptions;
  explicit: boolean;
}

interface NormalizedGraphqlOptions {
  enabled: boolean;
  options: GraphqlServerOptions;
  explicit: boolean;
}

export interface NaelFactoryHttpOptions extends HttpServerOptions {
  enabled?: boolean;
}

export interface NaelFactoryGraphqlOptions extends GraphqlServerOptions {
  enabled?: boolean;
}

export interface NaelFactoryOptions extends ApplicationOptions {
  http?: boolean | NaelFactoryHttpOptions;
  graphql?: boolean | NaelFactoryGraphqlOptions;
}

export interface NaelListenOptions {
  http?: number;
  graphql?: number;
}

export interface NaelListenResults {
  http?: Server;
  graphql?: GraphqlListenResult;
}

export interface NaelApplication {
  getHttpApplication(): HttpApplication | undefined;
  getGraphqlApplication(): GraphqlApplication | undefined;
  listen(options?: NaelListenOptions): Promise<NaelListenResults>;
  close(): Promise<void>;
  get<T>(token: Token<T>): Promise<T>;
  getConfig<TConfig extends Record<string, unknown>>(): ConfigService<TConfig>;
  getLogger(): Logger;
}

class NaelPlatformApplication implements NaelApplication {
  private logger: Logger;
  private closed = false;

  constructor(
    private readonly context: ApplicationContext,
    private readonly httpApp?: HttpApplication,
    private readonly graphqlApp?: GraphqlApplication,
  ) {
    const baseLogger = this.context.getLogger().child('NaelPlatform');
    this.logger = baseLogger;
    void this.context
      .get<LoggerFactory>(LoggerFactory)
      .then((factory) => {
        this.logger = factory.create({ context: 'NaelPlatform' });
      })
      .catch(() => {
        this.logger = baseLogger;
      });
  }

  getHttpApplication(): HttpApplication | undefined {
    return this.httpApp;
  }

  getGraphqlApplication(): GraphqlApplication | undefined {
    return this.graphqlApp;
  }

  async listen(options: NaelListenOptions = {}): Promise<NaelListenResults> {
    const results: NaelListenResults = {};

    if (!this.httpApp && !this.graphqlApp) {
      this.logger.warn('listen() invoked but both HTTP and GraphQL are disabled.');
      return results;
    }

    if (this.httpApp) {
      results.http = await this.httpApp.listen(options.http);
    }

    if (this.graphqlApp) {
      results.graphql = await this.graphqlApp.listen(options.graphql);
    }

    this.logger.info('Nael application started', {
      http: Boolean(results.http),
      graphql: Boolean(results.graphql),
    });

    return results;
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    const errors: Error[] = [];

    if (this.graphqlApp) {
      try {
        await this.graphqlApp.close();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    if (this.httpApp) {
      try {
        await this.httpApp.close();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    try {
      await this.context.close();
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }

    this.closed = true;
    this.logger.info('Nael application shutdown complete');

    if (errors.length) {
      const aggregate = new AggregateError(errors, 'One or more components failed to shut down');
      this.logger.error('Errors occurred during shutdown', aggregate);
      throw aggregate;
    }
  }

  async get<T>(token: Token<T>): Promise<T> {
    return this.context.get(token);
  }

  getConfig<TConfig extends Record<string, unknown>>(): ConfigService<TConfig> {
    return this.context.getConfig<TConfig>();
  }

  getLogger(): Logger {
    return this.logger;
  }
}

const normalizeHttpOptions = (value?: boolean | NaelFactoryHttpOptions): NormalizedHttpOptions => {
  if (typeof value === 'boolean') {
    return { enabled: value, options: {}, explicit: true };
  }

  if (!value) {
    return { enabled: true, options: {}, explicit: false };
  }

  const { enabled, ...rest } = value;
  return {
    enabled: enabled ?? true,
    options: rest,
    explicit: enabled !== undefined,
  };
};

const normalizeGraphqlOptions = (
  value?: boolean | NaelFactoryGraphqlOptions,
): NormalizedGraphqlOptions => {
  if (typeof value === 'boolean') {
    return { enabled: value, options: {}, explicit: true };
  }

  if (!value) {
    return { enabled: false, options: {}, explicit: false };
  }

  const { enabled, ...rest } = value;
  return {
    enabled: enabled ?? true,
    options: rest,
    explicit: enabled !== undefined,
  };
};

export class NaelFactory {
  static async create(
    rootModule: ClassType,
    options: NaelFactoryOptions = {},
  ): Promise<NaelApplication> {
    const { http, graphql, ...appOptions } = options;
    const app = new Application();
    const context = await app.bootstrap(rootModule, appOptions);

    const normalizedHttp = normalizeHttpOptions(http);
    const normalizedGraphql = normalizeGraphqlOptions(graphql);
    const logger = context.getLogger();
    const hasResolvers = context.getResolvers().length > 0;

    let graphqlEnabled = normalizedGraphql.enabled;
    if (!normalizedGraphql.explicit && hasResolvers) {
      graphqlEnabled = true;
    }

    if (graphqlEnabled && !hasResolvers) {
      logger.warn('GraphQL was enabled but no resolvers were discovered; skipping GraphQL server startup.');
      graphqlEnabled = false;
    }

    const httpApp = normalizedHttp.enabled
      ? createHttpApplicationFromContext(context, normalizedHttp.options)
      : undefined;
    const graphqlApp = graphqlEnabled
      ? createGraphqlApplicationFromContext(context, normalizedGraphql.options)
      : undefined;

    logger.info('NaelFactory created shared application context', {
      httpEnabled: normalizedHttp.enabled,
      graphqlEnabled,
    });

    return new NaelPlatformApplication(context, httpApp, graphqlApp);
  }
}
