import { Inject } from '@nl-framework/core';
import { Resolver, Mutation, Query, Arg, Context, type GraphqlContext } from '@nl-framework/graphql';
import { GraphQLError } from 'graphql';
import { BetterAuthService } from '../../service';
import { Public } from '../../http/public.decorator';
import { BETTER_AUTH_HTTP_OPTIONS } from '../../http/constants';
import type { NormalizedBetterAuthHttpOptions } from '../../http/options';
import {
  AccountInfoInput,
  AuthAccountInfo,
  AuthAccessTokenResult,
  AuthLinkedAccount,
  AuthLinkedAccountList,
  AuthMutationResult,
  AuthSession,
  AuthSessionList,
  AuthStatusResult,
  AuthUserSession,
  ChangeEmailInput,
  ChangePasswordInput,
  DeleteUserCallbackInput,
  DeleteUserInput,
  ForgetPasswordInput,
  LinkSocialAccountInput,
  OAuthTokenInput,
  PasswordResetCallbackInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  RevokeSessionInput,
  SendVerificationEmailInput,
  SetPasswordInput,
  SignInEmailInput,
  SignUpEmailInput,
  SocialLoginCallbackInput,
  SocialLoginUrlInput,
  SocialLoginUrlResult,
  UnlinkSocialAccountInput,
  UpdateUserInput,
  VerifyEmailInput,
  mapJsonToAuthSession,
  mapJsonToAuthUser,
  mapSessionToGraphql,
} from '../types';
import { createBetterAuthRequest, forwardBetterAuthHeaders } from '../utils';

const ROUTES = {
  signInEmail: { path: '/sign-in/email', method: 'POST' },
  signUpEmail: { path: '/sign-up/email', method: 'POST' },
  signOut: { path: '/sign-out', method: 'POST' },
  signInSocial: { path: '/sign-in/social', method: 'POST' },
  requestPasswordReset: { path: '/request-password-reset', method: 'POST' },
  requestPasswordResetCallback: { path: '/request-password-reset/callback', method: 'GET' },
  resetPassword: { path: '/reset-password', method: 'POST' },
  forgetPassword: { path: '/forget-password', method: 'POST' },
  forgetPasswordCallback: { path: '/forget-password/callback', method: 'GET' },
  verifyEmail: { path: '/verify-email', method: 'GET' },
  sendVerificationEmail: { path: '/send-verification-email', method: 'POST' },
  changeEmail: { path: '/change-email', method: 'POST' },
  changePassword: { path: '/change-password', method: 'POST' },
  setPassword: { path: '/set-password', method: 'POST' },
  updateUser: { path: '/user/update', method: 'POST' },
  deleteUser: { path: '/user/delete', method: 'POST' },
  deleteUserCallback: { path: '/user/delete/callback', method: 'GET' },
  listSessions: { path: '/sessions', method: 'GET' },
  revokeSession: { path: '/sessions/revoke', method: 'POST' },
  revokeSessions: { path: '/sessions/revoke-all', method: 'POST' },
  revokeOtherSessions: { path: '/sessions/revoke-other', method: 'POST' },
  linkSocialAccount: { path: '/accounts/link', method: 'POST' },
  unlinkSocialAccount: { path: '/accounts/unlink', method: 'POST' },
  listUserAccounts: { path: '/accounts', method: 'GET' },
  getAccessToken: { path: '/access-token', method: 'POST' },
  refreshToken: { path: '/access-token/refresh', method: 'POST' },
  accountInfo: { path: '/account', method: 'POST' },
} as const;

type RouteKey = keyof typeof ROUTES;

interface ProxyOptions {
  path?: string;
  method?: string;
  body?: unknown;
  expectJson?: boolean;
  errorMessage?: string;
  allowRedirect?: boolean;
}

const ensureRequest = (context: GraphqlContext): Request => {
  const request = (context as { request?: Request }).request;
  if (!request) {
    throw new GraphQLError('GraphQL context does not include an HTTP request.');
  }
  return request;
};

const extractErrorMessage = async (response: Response): Promise<string | undefined> => {
  try {
    const data = await response.clone().json();
    if (data && typeof data === 'object') {
      const message = (data as Record<string, unknown>).message;
      if (typeof message === 'string') {
        return message;
      }
    }
  } catch {
    /* ignore */
  }
  return undefined;
};

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
};

const normalizeStatus = (payload: unknown, fallback = true): AuthStatusResult => {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const success = typeof record.success === 'boolean'
      ? record.success
      : typeof record.status === 'boolean'
        ? record.status
        : fallback;
    const message = typeof record.message === 'string' ? record.message : null;
    return { success, message } satisfies AuthStatusResult;
  }

  return { success: fallback, message: null } satisfies AuthStatusResult;
};

const normalizeMutationResult = (payload: unknown): AuthMutationResult => {
  const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const sessionPayload = 'session' in record ? (record.session as unknown) : record;
  const session = mapJsonToAuthSession(sessionPayload);
  const success = typeof record.success === 'boolean'
    ? record.success
    : typeof record.status === 'boolean'
      ? record.status
      : true;
  const requiresRedirect = typeof record.requiresRedirect === 'boolean'
    ? record.requiresRedirect
    : typeof record.redirect === 'boolean'
      ? record.redirect
      : null;
  const redirectURL = typeof record.redirectURL === 'string'
    ? record.redirectURL
    : typeof record.url === 'string'
      ? record.url
      : null;

  return {
    success,
    session,
    requiresRedirect,
    redirectURL,
  } satisfies AuthMutationResult;
};

const normalizeSessionList = (payload: unknown): AuthSessionList => {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as Record<string, unknown>)?.sessions)
      ? ((payload as Record<string, unknown>).sessions as unknown[])
      : [];

  const sessions = source.map((entry) => {
    const record = entry as Record<string, unknown>;
    return {
      token: typeof record.token === 'string' ? record.token : '',
      expiresAt: toDate(record.expiresAt) ?? new Date(),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt),
      ipAddress: typeof record.ipAddress === 'string' ? record.ipAddress : null,
      userAgent: typeof record.userAgent === 'string' ? record.userAgent : null,
    } satisfies AuthUserSession;
  });

  return { sessions } satisfies AuthSessionList;
};

const normalizeLinkedAccounts = (payload: unknown): AuthLinkedAccountList => {
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as Record<string, unknown>)?.accounts)
      ? ((payload as Record<string, unknown>).accounts as unknown[])
      : [];

  const accounts = source.map((entry) => {
    const record = entry as Record<string, unknown>;
    const scopes = Array.isArray(record.scopes)
      ? (record.scopes as unknown[]).filter((value): value is string => typeof value === 'string')
      : [];

    return {
      id: typeof record.id === 'string' ? record.id : '',
      providerId: typeof record.providerId === 'string' ? record.providerId : '',
      accountId: typeof record.accountId === 'string' ? record.accountId : null,
      scopes,
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt),
    } satisfies AuthLinkedAccount;
  });

  return { accounts } satisfies AuthLinkedAccountList;
};

const normalizeAccessToken = (payload: unknown): AuthAccessTokenResult => {
  if (!payload || typeof payload !== 'object') {
    throw new GraphQLError('Better Auth did not return an access token.');
  }

  const record = payload as Record<string, unknown>;
  const accessToken = typeof record.accessToken === 'string' ? record.accessToken : null;
  if (!accessToken) {
    throw new GraphQLError('Better Auth did not return an access token.');
  }

  return {
    accessToken,
    refreshToken: typeof record.refreshToken === 'string' ? record.refreshToken : undefined,
    tokenType: typeof record.tokenType === 'string' ? record.tokenType : undefined,
    idToken: typeof record.idToken === 'string' ? record.idToken : undefined,
    accessTokenExpiresAt: toDate(record.accessTokenExpiresAt) ?? undefined,
    refreshTokenExpiresAt: toDate(record.refreshTokenExpiresAt) ?? undefined,
    scopes: Array.isArray(record.scopes)
      ? (record.scopes as unknown[]).filter((value): value is string => typeof value === 'string')
      : undefined,
  } satisfies AuthAccessTokenResult;
};

const normalizeAccountInfo = (payload: unknown): AuthAccountInfo => {
  if (!payload || typeof payload !== 'object') {
    throw new GraphQLError('Better Auth did not return account information.');
  }

  const record = payload as Record<string, unknown>;
  const user = mapJsonToAuthUser(record.user);
  if (!user) {
    throw new GraphQLError('Better Auth response was missing user information.');
  }

  return {
    user,
    raw: record.data !== undefined ? record.data : null,
  } satisfies AuthAccountInfo;
};

const buildQueryPath = (base: string, params: Record<string, string | null | undefined>): string => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      query.set(key, value);
    }
  }
  const suffix = query.toString();
  return suffix ? `${base}?${suffix}` : base;
};

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: BetterAuthService,
    @Inject(BETTER_AUTH_HTTP_OPTIONS) private readonly httpOptions: NormalizedBetterAuthHttpOptions,
  ) {}

  private getPath(key: RouteKey): string {
    return ROUTES[key]?.path ?? '/';
  }

  private getMethod(key: RouteKey): string {
    return ROUTES[key]?.method ?? 'POST';
  }

  private async proxy<T = unknown>(
    context: GraphqlContext,
    key: RouteKey,
    options: ProxyOptions = {},
  ): Promise<T | null> {
    const path = options.path ?? this.getPath(key);
    const method = options.method ?? this.getMethod(key);

    const request = createBetterAuthRequest({
      context,
      httpOptions: this.httpOptions,
      path,
      method,
      body: options.body,
    });

    const response = await this.authService.handle(request);
    forwardBetterAuthHeaders(context, response);

    const ok = response.ok || (options.allowRedirect && response.status >= 300 && response.status < 400);
    if (!ok) {
      const message = (await extractErrorMessage(response)) ?? options.errorMessage ?? `Better Auth request to ${path} failed.`;
      throw new GraphQLError(message, {
        extensions: {
          code: 'BETTER_AUTH_ERROR',
          httpStatus: response.status,
        },
      });
    }

    if (options.expectJson === false || response.status === 204) {
      return null;
    }

    try {
      return (await response.json()) as T;
    } catch {
      return null;
    }
  }

  @Public()
  @Query(() => AuthSession, {
    nullable: true,
    description: 'Returns the active Better Auth session for the current request, if one exists.',
  })
  async authSession(@Context() context: GraphqlContext): Promise<AuthSession | null> {
    const request = ensureRequest(context);
    const session = await this.authService.getSessionOrNull(request.headers);
    return mapSessionToGraphql(session);
  }

  @Query(() => AuthSessionList, {
    description: 'Lists active sessions for the authenticated user.',
  })
  async authSessions(@Context() context: GraphqlContext): Promise<AuthSessionList> {
    const payload = await this.proxy<unknown[]>(context, 'listSessions');
    return normalizeSessionList(payload ?? []);
  }

  @Query(() => AuthLinkedAccountList, {
    description: 'Returns the social accounts linked to the current Better Auth user.',
  })
  async authLinkedAccounts(@Context() context: GraphqlContext): Promise<AuthLinkedAccountList> {
    const payload = await this.proxy<unknown[]>(context, 'listUserAccounts');
    return normalizeLinkedAccounts(payload ?? []);
  }

  @Query(() => AuthAccountInfo, {
    description: 'Fetches provider account information using Better Auth account lookup.',
  })
  async accountInfo(
    @Arg('input') input: AccountInfoInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthAccountInfo> {
    const payload = await this.proxy(context, 'accountInfo', { body: input });
    return normalizeAccountInfo(payload);
  }

  @Public()
  @Mutation(() => AuthMutationResult)
  async signInWithEmail(
    @Arg('input') input: SignInEmailInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthMutationResult> {
    const payload = await this.proxy(context, 'signInEmail', { body: input });
    return normalizeMutationResult(payload);
  }

  @Public()
  @Mutation(() => AuthMutationResult)
  async signUpWithEmail(
    @Arg('input') input: SignUpEmailInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthMutationResult> {
    const payload = await this.proxy(context, 'signUpEmail', { body: input });
    return normalizeMutationResult(payload);
  }

  @Public()
  @Mutation(() => SocialLoginUrlResult, {
    description: 'Creates a social login URL while keeping cookies/configuration aligned with Better Auth.',
  })
  async createSocialLoginUrl(
    @Arg('input') input: SocialLoginUrlInput,
    @Context() context: GraphqlContext,
  ): Promise<SocialLoginUrlResult> {
    const payload = await this.proxy<Record<string, unknown>>(context, 'signInSocial', {
      body: { ...input, disableRedirect: true },
    });

    if (!payload || typeof payload !== 'object') {
      throw new GraphQLError('Better Auth did not return a social login URL.');
    }

    const url = typeof payload.url === 'string'
      ? payload.url
      : typeof (payload.redirectURL as unknown) === 'string'
        ? (payload.redirectURL as string)
        : null;
    if (!url) {
      throw new GraphQLError('Better Auth did not return a social login URL.');
    }

    return {
      url,
      state: typeof payload.state === 'string' ? payload.state : undefined,
      redirect: typeof payload.redirect === 'boolean'
        ? payload.redirect
        : typeof payload.requiresRedirect === 'boolean'
          ? payload.requiresRedirect
          : undefined,
    } satisfies SocialLoginUrlResult;
  }

  @Public()
  @Mutation(() => AuthMutationResult, {
    description: 'Completes a social login flow, handling both redirect and token-based flows.',
  })
  async signInWithSocial(
    @Arg('input') input: SocialLoginCallbackInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthMutationResult> {
    const payload = await this.proxy(context, 'signInSocial', { body: input });
    return normalizeMutationResult(payload);
  }

  @Mutation(() => AuthStatusResult)
  async signOut(@Context() context: GraphqlContext): Promise<AuthStatusResult> {
    const payload = await this.proxy(context, 'signOut');
    return normalizeStatus(payload);
  }

  @Public()
  @Mutation(() => AuthStatusResult)
  async requestPasswordReset(
    @Arg('input') input: RequestPasswordResetInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthStatusResult> {
    const payload = await this.proxy(context, 'requestPasswordReset', { body: input });
    return normalizeStatus(payload);
  }

  @Public()
  @Mutation(() => AuthStatusResult)
  async requestPasswordResetCallback(
    @Arg('input') input: PasswordResetCallbackInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthStatusResult> {
    const path = buildQueryPath(this.getPath('requestPasswordResetCallback'), {
      token: input.token,
      callbackURL: input.callbackURL ?? null,
    });
    await this.proxy(context, 'requestPasswordResetCallback', {
      path,
      method: 'GET',
      expectJson: false,
      allowRedirect: true,
    });
    return { success: true, message: null } satisfies AuthStatusResult;
  }

  @Public()
  @Mutation(() => AuthStatusResult)
  async forgetPassword(
    @Arg('input') input: ForgetPasswordInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthStatusResult> {
    const payload = await this.proxy(context, 'forgetPassword', { body: input });
    return normalizeStatus(payload);
  }

  @Public()
  @Mutation(() => AuthStatusResult)
  async forgetPasswordCallback(
    @Arg('input') input: PasswordResetCallbackInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthStatusResult> {
    const path = buildQueryPath(this.getPath('forgetPasswordCallback'), {
      token: input.token,
      callbackURL: input.callbackURL ?? null,
    });
    await this.proxy(context, 'forgetPasswordCallback', {
      path,
      method: 'GET',
      expectJson: false,
      allowRedirect: true,
    });
    return { success: true, message: null } satisfies AuthStatusResult;
  }

  @Public()
  @Mutation(() => AuthStatusResult)
  async resetPassword(
    @Arg('input') input: ResetPasswordInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthStatusResult> {
    const payload = await this.proxy(context, 'resetPassword', { body: input });
    return normalizeStatus(payload);
  }

  @Public()
  @Mutation(() => AuthStatusResult)
  async verifyEmail(
    @Arg('input') input: VerifyEmailInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthStatusResult> {
    const path = buildQueryPath(this.getPath('verifyEmail'), {
      token: input.token,
      callbackURL: input.callbackURL ?? null,
    });
    await this.proxy(context, 'verifyEmail', {
      path,
      method: 'GET',
      expectJson: false,
      allowRedirect: true,
    });
    return { success: true, message: null } satisfies AuthStatusResult;
  }

  @Mutation(() => AuthStatusResult)
  async sendVerificationEmail(
    @Arg('input') input: SendVerificationEmailInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthStatusResult> {
    const payload = await this.proxy(context, 'sendVerificationEmail', { body: input });
    return normalizeStatus(payload);
  }

  @Mutation(() => AuthStatusResult)
  async changeEmail(
    @Arg('input') input: ChangeEmailInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthStatusResult> {
    const payload = await this.proxy(context, 'changeEmail', { body: input });
    return normalizeStatus(payload);
  }

  @Mutation(() => AuthMutationResult)
  async changePassword(
    @Arg('input') input: ChangePasswordInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthMutationResult> {
    const payload = await this.proxy(context, 'changePassword', { body: input });
    return normalizeMutationResult(payload);
  }

  @Mutation(() => AuthStatusResult)
  async setPassword(
    @Arg('input') input: SetPasswordInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthStatusResult> {
    const payload = await this.proxy(context, 'setPassword', { body: input });
    return normalizeStatus(payload);
  }

  @Mutation(() => AuthStatusResult)
  async updateUser(
    @Arg('input') input: UpdateUserInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthStatusResult> {
    const payload = await this.proxy(context, 'updateUser', { body: input });
    return normalizeStatus(payload);
  }

  @Mutation(() => AuthStatusResult)
  async deleteUser(
    @Arg('input', { nullable: true }) input: DeleteUserInput | null,
    @Context() context: GraphqlContext,
  ): Promise<AuthStatusResult> {
    const payload = await this.proxy(context, 'deleteUser', { body: input ?? {} });
    return normalizeStatus(payload);
  }

  @Mutation(() => AuthStatusResult)
  async deleteUserCallback(
    @Arg('input') input: DeleteUserCallbackInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthStatusResult> {
    const path = buildQueryPath(this.getPath('deleteUserCallback'), {
      token: input.token,
      callbackURL: input.callbackURL ?? null,
    });
    await this.proxy(context, 'deleteUserCallback', {
      path,
      method: 'GET',
      expectJson: false,
      allowRedirect: true,
    });
    return { success: true, message: null } satisfies AuthStatusResult;
  }

  @Mutation(() => AuthStatusResult)
  async revokeSession(
    @Arg('input') input: RevokeSessionInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthStatusResult> {
    const payload = await this.proxy(context, 'revokeSession', { body: input });
    return normalizeStatus(payload);
  }

  @Mutation(() => AuthStatusResult)
  async revokeSessions(@Context() context: GraphqlContext): Promise<AuthStatusResult> {
    const payload = await this.proxy(context, 'revokeSessions');
    return normalizeStatus(payload);
  }

  @Mutation(() => AuthStatusResult)
  async revokeOtherSessions(@Context() context: GraphqlContext): Promise<AuthStatusResult> {
    const payload = await this.proxy(context, 'revokeOtherSessions');
    return normalizeStatus(payload);
  }

  @Mutation(() => AuthMutationResult, {
    description: 'Links a social provider account to the current user.',
  })
  async linkSocialAccount(
    @Arg('input') input: LinkSocialAccountInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthMutationResult> {
    const payload = await this.proxy(context, 'linkSocialAccount', { body: input });
    return normalizeMutationResult(payload);
  }

  @Mutation(() => AuthStatusResult)
  async unlinkSocialAccount(
    @Arg('input') input: UnlinkSocialAccountInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthStatusResult> {
    const payload = await this.proxy(context, 'unlinkSocialAccount', { body: input });
    return normalizeStatus(payload);
  }

  @Mutation(() => AuthAccessTokenResult)
  async getAccessToken(
    @Arg('input') input: OAuthTokenInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthAccessTokenResult> {
    const payload = await this.proxy(context, 'getAccessToken', { body: input });
    return normalizeAccessToken(payload);
  }

  @Mutation(() => AuthAccessTokenResult)
  async refreshToken(
    @Arg('input') input: OAuthTokenInput,
    @Context() context: GraphqlContext,
  ): Promise<AuthAccessTokenResult> {
    const payload = await this.proxy(context, 'refreshToken', { body: input });
    return normalizeAccessToken(payload);
  }
}
