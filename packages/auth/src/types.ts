import type { BetterAuthOptions } from 'better-auth';

export interface BetterAuthSessionInput {
  headers: Headers;
  query?: {
    disableCookieCache?: boolean;
    disableRefresh?: boolean;
    [key: string]: unknown;
  };
  asResponse?: boolean;
  returnHeaders?: boolean;
  [key: string]: unknown;
}

export interface BetterAuthSessionPayload {
  user?: unknown;
  token?: string | null;
  [key: string]: unknown;
}

export interface BetterAuthApi {
  getSession(context: BetterAuthSessionInput): Promise<BetterAuthSessionPayload | null>;
  [key: string]: (...args: any[]) => unknown;
}

export interface BetterAuthInstance {
  handler(request: Request): Promise<Response>;
  api: BetterAuthApi;
  context?: {
    runMigrations?: () => Promise<void>;
    [key: string]: unknown;
  };
}

export type BetterAuthAdapter = BetterAuthOptions['database'];
export type BetterAuthAdapterFactory = (...args: any[]) => BetterAuthAdapter;
