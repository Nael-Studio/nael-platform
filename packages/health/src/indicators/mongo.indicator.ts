import type { Token } from '@nl-framework/core';
import type {
  BindableHealthIndicator,
  HealthCheckContext,
  HealthResult,
} from '../interfaces';

export interface MongoIndicatorOptions {
  /** Named connection to ping (matches the ORM connection name). */
  connectionName?: string;
  /**
   * Explicit provider token for the connection. When omitted the ORM's
   * `getConnectionToken(connectionName)` is used (requires `@nl-framework/orm`).
   */
  token?: Token;
  /** Override the indicator name (default `mongo`). */
  name?: string;
}

interface PingableConnection {
  getDatabase(): { command(spec: Record<string, unknown>): Promise<unknown> };
}

const isPingable = (value: unknown): value is PingableConnection =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as PingableConnection).getDatabase === 'function';

/**
 * Pings a MongoDB connection resolved from DI (`{ ping: 1 }`). The connection
 * token is resolved as an **optional** injection, but the indicator fails fast
 * at **boot** (not request time) when neither `@nl-framework/orm` is installed
 * nor a connection is registered.
 */
export const mongoIndicator = (options: MongoIndicatorOptions = {}): BindableHealthIndicator => {
  let token: Token | undefined = options.token;
  let context: HealthCheckContext | undefined;

  return {
    name: options.name ?? 'mongo',

    async bind(ctx: HealthCheckContext): Promise<void> {
      context = ctx;

      if (!token) {
        // Non-literal specifier keeps this a soft, runtime-only dependency.
        const specifier = '@nl-framework/orm';
        let orm: { getConnectionToken(name?: string): symbol };
        try {
          orm = (await import(specifier)) as typeof orm;
        } catch {
          throw new Error(
            '[health] mongoIndicator() requires @nl-framework/orm to be installed, ' +
              'or an explicit `token` for the connection provider.',
          );
        }
        token = orm.getConnectionToken(options.connectionName);
      }

      const connection = await ctx.resolve(token);
      if (!isPingable(connection)) {
        throw new Error(
          '[health] mongoIndicator(): no Mongo connection is registered' +
            `${options.connectionName ? ` for "${options.connectionName}"` : ''}. ` +
            'Register OrmModule.forRoot(...) or pass an explicit `token`.',
        );
      }
    },

    async check(): Promise<HealthResult> {
      if (!context || !token) {
        return { status: 'down', details: { reason: 'not bound' } };
      }
      const connection = await context.resolve(token);
      if (!isPingable(connection)) {
        return { status: 'down', details: { reason: 'connection unavailable' } };
      }
      const startedAt = performance.now();
      try {
        await connection.getDatabase().command({ ping: 1 });
        return { status: 'up', details: { latencyMs: Math.round(performance.now() - startedAt) } };
      } catch (error) {
        return {
          status: 'down',
          details: { reason: error instanceof Error ? error.message : String(error) },
        };
      }
    },
  };
};
