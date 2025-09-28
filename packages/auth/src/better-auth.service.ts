import { Logger } from '@nl-framework/logger';
import type {
  AuthorizationRequirements,
  BetterAuthAdapter,
  BetterAuthPlugin,
  BetterAuthSession,
  BetterAuthUser,
  BetterAuthUserInput,
  SignInCredentials,
} from './interfaces';

export class BetterAuthService {
  constructor(private readonly adapter: BetterAuthAdapter, private readonly logger: Logger) {}

  getInstance<T = BetterAuthAdapter>(): T {
    return this.adapter as unknown as T;
  }

  async registerUser(user: BetterAuthUserInput): Promise<BetterAuthUser> {
    if (typeof this.adapter.register !== 'function') {
      throw new Error('The configured BetterAuth adapter does not support user registration.');
    }
    const result = await this.adapter.register(user);
    this.logger.debug('Registered user', { userId: result.id, email: result.email });
    return result;
  }

  async signIn(credentials: SignInCredentials): Promise<BetterAuthSession> {
    const session = await this.adapter.authenticate(credentials);
    this.logger.debug('Authentication successful', { userId: session.userId, sessionId: session.sessionId });
    return session;
  }

  async signOut(sessionId: string): Promise<void> {
    if (typeof this.adapter.invalidate !== 'function') {
      this.logger.warn('The configured BetterAuth adapter does not expose invalidate(); skipping sign out.', {
        sessionId,
      });
      return;
    }
    await this.adapter.invalidate(sessionId);
    this.logger.debug('Session invalidated', { sessionId });
  }

  async authorize(
    session: BetterAuthSession,
    requirements?: AuthorizationRequirements,
  ): Promise<boolean> {
    if (typeof this.adapter.authorize === 'function') {
      return this.adapter.authorize(session, requirements);
    }

    if (!requirements?.roles?.length) {
      return true;
    }

    const roles = new Set(session.roles);
    return requirements.roles.every((role) => roles.has(role));
  }

  async getUser(userId: string): Promise<BetterAuthUser | undefined> {
    if (typeof this.adapter.getUser !== 'function') {
      this.logger.warn('The configured BetterAuth adapter does not expose getUser(); returning undefined.', {
        userId,
      });
      return undefined;
    }

    return this.adapter.getUser(userId);
  }

  async use(plugin: BetterAuthPlugin): Promise<void> {
    if (typeof this.adapter.use === 'function') {
      await this.adapter.use(plugin);
      return;
    }

    if (typeof plugin === 'function') {
      await plugin(this.adapter as never);
      return;
    }

    this.logger.warn('Unable to apply BetterAuth plugin because the adapter lacks a compatible "use" method.');
  }

  async resolveSession(token: string): Promise<BetterAuthSession | undefined> {
    if (typeof this.adapter.getSessionByToken === 'function') {
      return this.adapter.getSessionByToken(token);
    }

    this.logger.warn('The configured BetterAuth adapter does not expose getSessionByToken(); returning undefined.', {
      tokenPreview: `${token.slice(0, 6)}...`,
    });
    return undefined;
  }

  async authorizeToken(token: string, requirements?: AuthorizationRequirements): Promise<boolean> {
    const session = await this.resolveSession(token);
    if (!session) {
      return false;
    }

    return this.authorize(session, requirements);
  }
}
