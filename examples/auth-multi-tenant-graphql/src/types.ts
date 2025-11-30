import type { BetterAuthSessionPayload } from '@nl-framework/auth';

export interface ExampleConfig {
  server?: {
    host?: string;
    port?: number;
  };
  mongodb?: {
    uri?: string;
    dbName?: string;
  };
}

export interface AuthenticatedGraphqlContext {
  auth?: BetterAuthSessionPayload | null;
  req?: unknown;
}
