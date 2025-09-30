import type { Auth } from 'better-auth';

export type BetterAuthInstance = Auth;
export type BetterAuthSessionPayload = Awaited<ReturnType<Auth['api']['getSession']>>;
