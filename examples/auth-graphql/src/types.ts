import type { GraphqlContext } from '@nl-framework/graphql';
import type { BetterAuthSessionPayload } from '@nl-framework/auth';

export interface AuthenticatedGraphqlContext extends GraphqlContext {
  auth?: BetterAuthSessionPayload | null;
}

export interface ExampleConfig extends Record<string, unknown> {
  app: {
    name: string;
  };
  server: {
    host: string;
    httpPort: number;
    graphqlPort: number;
  };
  auth: {
    baseUrl: string;
    secret?: string;
    routePrefix?: string;
  };
  mongo: {
    uri: string;
    db: string;
  };
}
