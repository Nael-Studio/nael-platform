import type {
  GraphqlApplication,
  GraphqlExecuteParams,
  GraphqlExecuteResult,
} from '@nl-framework/graphql';

/**
 * Executes GraphQL operations against a {@link GraphqlApplication} in-process via
 * Apollo's `executeOperation`. The framework's scoped container resolver is
 * attached to the context, so guards, interceptors, and resolvers run exactly as
 * they would over HTTP — no server is started and no port is bound.
 */
export class GraphqlTestClient {
  constructor(private readonly app: GraphqlApplication) {}

  /** The underlying application, for advanced use. */
  getApplication(): GraphqlApplication {
    return this.app;
  }

  /** Execute a query or mutation and return `{ data, errors }`. */
  execute<TData = Record<string, unknown>>(
    params: GraphqlExecuteParams,
  ): Promise<GraphqlExecuteResult<TData>> {
    return this.app.execute<TData>(params);
  }

  /**
   * Detaches this client from the shared context. The owning `TestingModule` is
   * responsible for shutting the context down.
   */
  async close(): Promise<void> {
    await this.app.close();
  }
}
