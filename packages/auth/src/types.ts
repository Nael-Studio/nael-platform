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

/**
 * The payload returned by BetterAuth's session API.
 * 
 * @template U - The type of the user object. Defaults to `unknown`.
 * 
 * @example
 * ```typescript
 * interface MyUser {
 *   id: string;
 *   email: string;
 *   name?: string;
 * }
 * 
 * const session: BetterAuthSessionPayload<MyUser> = await authService.getSession(request);
 * if (session?.user) {
 *   console.log(session.user.email); // TypeScript knows this is a string
 * }
 * ```
 */
export interface BetterAuthSessionPayload<U = unknown> {
  user?: U;
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
export type BetterAuthAdapterFactory = (options: BetterAuthOptions) => BetterAuthAdapter;
