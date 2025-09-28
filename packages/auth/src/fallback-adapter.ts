import { randomUUID, createHash, randomBytes } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import type {
  BetterAuthAdapter,
  BetterAuthSession,
  BetterAuthUser,
  BetterAuthUserInput,
  SignInCredentials,
  AuthorizationRequirements,
  BetterAuthPlugin,
} from './interfaces';

interface InternalUser extends BetterAuthUser {
  roles: string[];
  salt: string;
}

const hashPassword = (password: string, salt: string): string =>
  createHash('sha256').update(`${salt}:${password}`).digest('hex');

const sanitizeUser = (user: InternalUser): BetterAuthUser => ({
  id: user.id,
  email: user.email,
  passwordHash: user.passwordHash,
  roles: user.roles?.length ? [...user.roles] : ['user'],
  metadata: user.metadata ? { ...user.metadata } : undefined,
});

export class InMemoryBetterAuth implements BetterAuthAdapter {
  private readonly users = new Map<string, InternalUser>();
  private readonly sessions = new Map<string, BetterAuthSession>();

  constructor(private readonly config: Record<string, unknown> = {}) {}

  async register(user: BetterAuthUserInput): Promise<BetterAuthUser> {
    const normalizedEmail = user.email.trim().toLowerCase();
    for (const existing of this.users.values()) {
      if (existing.email === normalizedEmail) {
        throw new Error('A user with the provided email already exists.');
      }
    }

    const salt = randomBytes(16).toString('hex');
    const passwordHash = hashPassword(user.password, salt);
    const stored: InternalUser = {
      id: user.id ?? randomUUID(),
      email: normalizedEmail,
      passwordHash,
      salt,
      roles: user.roles?.length ? [...new Set(user.roles)] : ['user'],
      metadata: user.metadata ? { ...user.metadata } : undefined,
    };

    this.users.set(stored.id, stored);
    return sanitizeUser(stored);
  }

  async authenticate(credentials: SignInCredentials): Promise<BetterAuthSession> {
    const normalizedEmail = credentials.email.trim().toLowerCase();
    const user = Array.from(this.users.values()).find((candidate) => candidate.email === normalizedEmail);

    if (!user) {
      await sleep(50); // mitigate timing attacks slightly by equalizing response time
      throw new Error('Invalid credentials');
    }

    const candidateHash = hashPassword(credentials.password, user.salt);
    if (candidateHash !== user.passwordHash) {
      await sleep(50);
      throw new Error('Invalid credentials');
    }

    const sessionId = randomUUID();
    const issuedAt = new Date();
    const expiresAt = this.computeExpiry();
    const roles = user.roles?.length ? [...user.roles] : ['user'];
    const session: BetterAuthSession = {
      sessionId,
      userId: user.id,
      roles,
      issuedAt,
      expiresAt,
      token: hashPassword(sessionId, user.salt),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  async invalidate(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async authorize(
    session: BetterAuthSession,
    requirements?: AuthorizationRequirements,
  ): Promise<boolean> {
    if (!requirements?.roles?.length) {
      return true;
    }

    const user = await this.getUser(session.userId);
    if (!user) {
      return false;
    }

  const candidateRoles = session.roles.length ? session.roles : user.roles ?? [];
  const roles = new Set(candidateRoles);
    return requirements.roles.every((role) => roles.has(role));
  }

  async getUser(userId: string): Promise<BetterAuthUser | undefined> {
    const user = this.users.get(userId);
    return user ? sanitizeUser(user) : undefined;
  }

  async getSessionByToken(token: string): Promise<BetterAuthSession | undefined> {
    for (const session of this.sessions.values()) {
      if (session.token === token) {
        return { ...session };
      }
    }
    return undefined;
  }

  async use(plugin: BetterAuthPlugin): Promise<void> {
    if (typeof plugin === 'function') {
      await plugin(this);
    }
  }

  seed(users: BetterAuthUserInput[]): void {
    for (const user of users) {
      void this.register(user).catch(() => undefined);
    }
  }

  private computeExpiry(): Date | null {
    const ttl = Number(this.config.sessionTtlMs ?? 1000 * 60 * 60 * 24);
    if (!Number.isFinite(ttl) || ttl <= 0) {
      return null;
    }
    return new Date(Date.now() + ttl);
  }
}
