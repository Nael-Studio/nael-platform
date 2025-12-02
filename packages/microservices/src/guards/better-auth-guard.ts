import type { CanActivate } from '../decorators/guards';

export interface BetterAuthMicroGuardOptions {
  upstreamUrl: string;
  tokenField?: string; // field on payload that carries token
  headerName?: string; // header name when calling upstream (default Authorization: Bearer)
  validateSession?: (session: unknown) => boolean | Promise<boolean>;
}

/**
 * Simple BetterAuth-aware guard for microservices payloads.
 * Expects a token in the payload (default: data.token) and verifies it against the BetterAuth upstream.
 */
export class BetterAuthMicroGuard implements CanActivate {
  private readonly upstreamUrl: string;
  private readonly tokenField: string;
  private readonly headerName: string;
  private readonly validateSession?: BetterAuthMicroGuardOptions['validateSession'];

  constructor(options: BetterAuthMicroGuardOptions) {
    this.upstreamUrl = options.upstreamUrl.replace(/\/+$/, '');
    this.tokenField = options.tokenField ?? 'token';
    this.headerName = options.headerName ?? 'authorization';
    this.validateSession = options.validateSession;
  }

  async canActivate(context: { pattern: string | Record<string, unknown>; data: unknown }) {
    const token = this.extractToken(context.data);
    if (!token) return false;

    const res = await fetch(`${this.upstreamUrl}/session`, {
      method: 'GET',
      headers: {
        [this.headerName]: this.headerName.toLowerCase() === 'authorization' ? `Bearer ${token}` : token,
      },
    });

    if (!res.ok) return false;
    const session = await res.json().catch(() => null);
    if (this.validateSession) {
      return Boolean(await this.validateSession(session));
    }
    return Boolean(session);
  }

  private extractToken(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null;
    const obj = data as Record<string, unknown>;
    const value = obj[this.tokenField];
    return typeof value === 'string' && value.length > 0 ? value : null;
  }
}
