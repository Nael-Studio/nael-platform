import type { ClassType, Token } from '@nl-framework/core';

export interface BetterAuthUserInput {
  id?: string;
  email: string;
  password: string;
  roles?: string[];
  metadata?: Record<string, unknown>;
}

export interface BetterAuthUser extends Omit<BetterAuthUserInput, 'password'> {
  id: string;
  passwordHash?: string;
}

export interface BetterAuthSession {
  sessionId: string;
  userId: string;
  roles: string[];
  issuedAt: Date;
  expiresAt: Date | null;
  token: string;
  metadata?: Record<string, unknown>;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthorizationRequirements {
  roles?: string[];
}

export interface BetterAuthAdapter {
  use?(plugin: BetterAuthPlugin): void | Promise<void>;
  register?(user: BetterAuthUserInput): Promise<BetterAuthUser>;
  authenticate(credentials: SignInCredentials): Promise<BetterAuthSession>;
  invalidate?(sessionId: string): Promise<void>;
  authorize?(
    session: BetterAuthSession,
    requirements?: AuthorizationRequirements,
  ): Promise<boolean>;
  getUser?(userId: string): Promise<BetterAuthUser | undefined>;
  getSessionByToken?(token: string): Promise<BetterAuthSession | undefined>;
}

export type BetterAuthPlugin = unknown;

export interface BetterAuthModuleOptions {
  instance?: BetterAuthAdapter;
  config?: Record<string, unknown>;
  plugins?: BetterAuthPlugin[];
  defaultUsers?: BetterAuthUserInput[];
  autoSeed?: boolean;
}

export interface BetterAuthModuleOptionsFactory {
  createBetterAuthOptions(): Promise<BetterAuthModuleOptions> | BetterAuthModuleOptions;
}

export interface BetterAuthModuleAsyncOptions {
  imports?: ClassType[];
  inject?: Token[];
  useExisting?: Token<BetterAuthModuleOptionsFactory>;
  useClass?: ClassType<BetterAuthModuleOptionsFactory>;
  useFactory?: (...args: unknown[]) => Promise<BetterAuthModuleOptions> | BetterAuthModuleOptions;
}

export interface MiddlewareAuthorizationOptions {
  requiredRoles?: string[];
  headerName?: string;
}
