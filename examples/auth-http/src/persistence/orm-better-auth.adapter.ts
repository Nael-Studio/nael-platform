import { randomUUID, createHash, randomBytes } from 'node:crypto';
import { OrmRepository, ObjectId, type OrmEntityDocument } from '@nl-framework/orm';
import type { Filter } from 'mongodb';
import type {
  BetterAuthAdapter,
  BetterAuthSession,
  BetterAuthUser,
  BetterAuthUserInput,
  SignInCredentials,
  AuthorizationRequirements,
  BetterAuthPlugin,
} from '@nl-framework/auth';
import { AuthUserDocument } from './auth-user.document';

interface AdapterOptions {
  sessionTtlMs?: number;
}

type AuthUserRecord = OrmEntityDocument<AuthUserDocument>;

const hashPassword = (password: string, salt: string): string =>
  createHash('sha256').update(`${salt}:${password}`).digest('hex');

const sanitizeUser = (user: AuthUserRecord): BetterAuthUser => ({
  id: user._id instanceof ObjectId ? user._id.toHexString() : String(user._id),
  email: user.email,
  passwordHash: user.passwordHash,
  roles: user.roles?.length ? [...new Set(user.roles)] : ['user'],
  metadata: user.metadata ? { ...user.metadata } : undefined,
});

interface StoredSession extends BetterAuthSession {}

export class OrmBetterAuthAdapter implements BetterAuthAdapter {
  private readonly sessions = new Map<string, StoredSession>();

  constructor(
    private readonly users: OrmRepository<AuthUserDocument>,
    private readonly options: AdapterOptions = {},
  ) {}

  async register(user: BetterAuthUserInput): Promise<BetterAuthUser> {
    const email = user.email.trim().toLowerCase();
    const filter: Filter<AuthUserDocument> = { email };
    const existing = (await this.users.findOne(filter)) as AuthUserRecord | null;
    if (existing) {
      throw new Error('A user with the provided email already exists.');
    }

    const salt = randomBytes(16).toString('hex');
    const passwordHash = hashPassword(user.password, salt);

    const created = (await this.users.insertOne({
      email,
      passwordHash,
      salt,
      roles: user.roles?.length ? [...new Set(user.roles)] : ['user'],
      metadata: user.metadata ? { ...user.metadata } : undefined,
    })) as AuthUserRecord;

    return sanitizeUser(created);
  }

  async authenticate(credentials: SignInCredentials): Promise<BetterAuthSession> {
    const email = credentials.email.trim().toLowerCase();
    const filter: Filter<AuthUserDocument> = { email };
    const user = (await this.users.findOne(filter)) as AuthUserRecord | null;

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const hash = hashPassword(credentials.password, user.salt);
    if (hash !== user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    const sessionId = randomUUID();
    const issuedAt = new Date();
    const expiresAt = this.computeExpiry();
    const roles = user.roles?.length ? [...user.roles] : ['user'];
    const token = hashPassword(sessionId, user.salt);

    const session: StoredSession = {
      sessionId,
      userId: user._id instanceof ObjectId ? user._id.toHexString() : String(user._id),
      roles,
      issuedAt,
      expiresAt,
      token,
    };

    this.sessions.set(sessionId, session);
    return { ...session };
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

    const candidateRoles = session.roles?.length ? session.roles : (await this.getUser(session.userId))?.roles ?? [];
    const roles = new Set(candidateRoles);
    return requirements.roles.every((role) => roles.has(role));
  }

  async getUser(userId: string): Promise<BetterAuthUser | undefined> {
    const entityId = this.parseObjectId(userId);
    if (!entityId) {
      return undefined;
    }

    const user = (await this.users.findById(entityId)) as AuthUserRecord | null;
    return user ? sanitizeUser(user) : undefined;
  }

  async getSessionByToken(token: string): Promise<BetterAuthSession | undefined> {
    for (const session of this.sessions.values()) {
      if (session.token === token) {
        if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
          this.sessions.delete(session.sessionId);
          return undefined;
        }
        return { ...session };
      }
    }
    return undefined;
  }

  async use(plugin: BetterAuthPlugin): Promise<void> {
    if (typeof plugin === 'function') {
      await plugin(this as never);
    }
  }

  private parseObjectId(id: string): ObjectId | null {
    if (ObjectId.isValid(id)) {
      return new ObjectId(id);
    }
    return null;
  }

  private computeExpiry(): Date | null {
    const ttl = Number(this.options.sessionTtlMs ?? 1000 * 60 * 60 * 24);
    if (!Number.isFinite(ttl) || ttl <= 0) {
      return null;
    }
    return new Date(Date.now() + ttl);
  }
}
