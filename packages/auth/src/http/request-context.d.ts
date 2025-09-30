import type { BetterAuthSessionPayload } from '../types';

declare module '@nl-framework/http' {
  interface RequestContext {
    auth?: BetterAuthSessionPayload | null;
  }
}
