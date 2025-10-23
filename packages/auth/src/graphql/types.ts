import { Field, ObjectType, InputType } from '@nl-framework/graphql';
import type { BetterAuthSessionPayload } from '../types';

@ObjectType({ description: 'User profile information returned by Better Auth.' })
export class AuthUser {
  @Field()
  id!: string;

  @Field({ nullable: true })
  email!: string | null;

  @Field({ nullable: true })
  name!: string | null;

  @Field({ nullable: true })
  image!: string | null;

  @Field()
  emailVerified!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType({ description: 'GraphQL-friendly representation of a Better Auth session.' })
export class AuthSession {
  @Field({ nullable: true })
  token!: string | null;

  @Field(() => AuthUser)
  user!: AuthUser;
}

const coerceDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'number') {
    return new Date(value);
  }
  if (typeof value === 'string') {
    return new Date(value);
  }
  return new Date();
};

export const mapJsonToAuthUser = (payload: unknown): AuthUser | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const source = payload as Record<string, unknown>;
  if (source.id === undefined) {
    return null;
  }

  return {
    id: String(source.id ?? ''),
    email: typeof source.email === 'string' ? source.email : null,
    name: typeof source.name === 'string' ? source.name : null,
    image: typeof source.image === 'string' ? source.image : null,
    emailVerified: Boolean(source.emailVerified),
    createdAt: coerceDate(source.createdAt),
    updatedAt: coerceDate(source.updatedAt),
  } satisfies AuthUser;
};

export const mapSessionToGraphql = (session: BetterAuthSessionPayload | null): AuthSession | null => {
  if (!session) {
    return null;
  }

  return {
    token: (session as Record<string, unknown>).token as string | null,
    user: mapJsonToAuthUser(session.user) ?? {
      id: '',
      email: null,
      name: null,
      image: null,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  } satisfies AuthSession;
};

export const mapJsonToAuthSession = (payload: unknown): AuthSession | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const source = payload as Record<string, unknown>;
  const user = mapJsonToAuthUser(source.user);
  if (!user) {
    return null;
  }

  return {
    token: typeof source.token === 'string' ? source.token : null,
    user,
  } satisfies AuthSession;
};

@InputType({ description: 'Credentials required to sign in with email and password.' })
export class SignInEmailInput {
  @Field()
  email!: string;

  @Field()
  password!: string;

  @Field({ nullable: true })
  rememberMe?: boolean;

  @Field({ nullable: true })
  callbackURL?: string;
}

@InputType({ description: 'Payload required to register a user using email and password.' })
export class SignUpEmailInput {
  @Field()
  email!: string;

  @Field()
  password!: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  image?: string;

  @Field({ nullable: true })
  rememberMe?: boolean;

  @Field({ nullable: true })
  callbackURL?: string;
}

@ObjectType({ description: 'Result returned after performing an auth mutation.' })
export class AuthMutationResult {
  @Field(() => AuthSession, { nullable: true })
  session!: AuthSession | null;

  @Field({ description: 'Indicates whether the mutation completed successfully.' })
  success!: boolean;

  @Field(() => Boolean, { nullable: true, description: 'Indicates whether the client should redirect to complete the flow.' })
  requiresRedirect?: boolean | null;

  @Field(() => String, { nullable: true, description: 'Optional redirect URL returned by Better Auth.' })
  redirectURL?: string | null;
}

@ObjectType({ description: 'Represents a generic acknowledgment returned by Better Auth.' })
export class AuthStatusResult {
  @Field({ description: 'Indicates whether the operation succeeded.' })
  success!: boolean;

  @Field(() => String, { nullable: true, description: 'Optional status or error message.' })
  message?: string | null;
}

@InputType({ description: 'Payload to initiate an email/password reset request.' })
export class RequestPasswordResetInput {
  @Field()
  email!: string;

  @Field({ nullable: true, description: 'URL Better Auth should redirect to during the reset flow.' })
  redirectTo?: string;
}

@InputType()
export class ResetPasswordInput {
  @Field()
  token!: string;

  @Field()
  newPassword!: string;
}

@InputType()
export class ForgetPasswordInput {
  @Field()
  email!: string;

  @Field({ nullable: true })
  redirectTo?: string;
}

@InputType()
export class ChangeEmailInput {
  @Field()
  newEmail!: string;

  @Field({ nullable: true })
  callbackURL?: string;
}

@InputType()
export class ChangePasswordInput {
  @Field()
  currentPassword!: string;

  @Field()
  newPassword!: string;

  @Field({ nullable: true, description: 'When true, revoke other active sessions after changing the password.' })
  revokeOtherSessions?: boolean;
}

@InputType()
export class SetPasswordInput {
  @Field()
  newPassword!: string;
}

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  image?: string;

  @Field({ nullable: true })
  email?: string;
}

@InputType({ description: 'Parameters for completing password reset callback redirects.' })
export class PasswordResetCallbackInput {
  @Field()
  token!: string;

  @Field({ nullable: true })
  callbackURL?: string;
}

@InputType({ description: 'Input payload for deleting a user account.' })
export class DeleteUserInput {
  @Field({ nullable: true })
  password?: string;

  @Field({ nullable: true })
  token?: string;

  @Field({ nullable: true })
  callbackURL?: string;
}

@InputType({ description: 'Parameters for completing delete-user callback redirects.' })
export class DeleteUserCallbackInput {
  @Field()
  token!: string;

  @Field({ nullable: true })
  callbackURL?: string;
}

@InputType({ description: 'Input required to retrieve account info from Better Auth.' })
export class AccountInfoInput {
  @Field({ description: 'The Better Auth account identifier returned by list accounts.' })
  accountId!: string;
}

@ObjectType({ description: 'Linked account metadata returned by Better Auth.' })
export class AuthLinkedAccount {
  @Field()
  id!: string;

  @Field()
  providerId!: string;

  @Field(() => String, { nullable: true })
  accountId?: string | null;

  @Field(() => [String])
  scopes!: string[];

  @Field(() => Date, { nullable: true })
  createdAt?: Date | null;

  @Field(() => Date, { nullable: true })
  updatedAt?: Date | null;
}

@ObjectType()
export class AuthLinkedAccountList {
  @Field(() => [AuthLinkedAccount])
  accounts!: AuthLinkedAccount[];
}

@ObjectType({ description: 'Account information resolved via Better Auth providers.' })
export class AuthAccountInfo {
  @Field(() => AuthUser)
  user!: AuthUser;

  @Field({ nullable: true, description: 'Raw provider data serialised as JSON.' })
  raw!: string | null;
}

@ObjectType()
export class AuthUserSession {
  @Field()
  token!: string;

  @Field(() => Date)
  expiresAt!: Date;

  @Field(() => Date, { nullable: true })
  createdAt?: Date | null;

  @Field(() => Date, { nullable: true })
  updatedAt?: Date | null;

  @Field(() => String, { nullable: true })
  ipAddress?: string | null;

  @Field(() => String, { nullable: true })
  userAgent?: string | null;
}

@ObjectType()
export class AuthSessionList {
  @Field(() => [AuthUserSession])
  sessions!: AuthUserSession[];
}

@InputType()
export class RevokeSessionInput {
  @Field()
  token!: string;
}

@InputType()
export class SocialLoginIdTokenInput {
  @Field()
  token!: string;

  @Field({ nullable: true })
  nonce?: string;

  @Field({ nullable: true })
  accessToken?: string;

  @Field({ nullable: true })
  refreshToken?: string;

  @Field({ nullable: true })
  expiresAt?: number;

  @Field(() => [String], { nullable: true })
  scopes?: string[];
}

@InputType()
export class SocialLoginUrlInput {
  @Field()
  provider!: string;

  @Field({ nullable: true })
  callbackURL?: string;

  @Field({ nullable: true })
  newUserCallbackURL?: string;

  @Field({ nullable: true })
  errorCallbackURL?: string;

  @Field({ nullable: true })
  requestSignUp?: boolean;

  @Field({ nullable: true })
  disableRedirect?: boolean;

  @Field(() => [String], { nullable: true })
  scopes?: string[];

  @Field({ nullable: true })
  loginHint?: string;
}

@ObjectType()
export class SocialLoginUrlResult {
  @Field()
  url!: string;

  @Field({ nullable: true })
  state?: string;

  @Field({ nullable: true })
  redirect?: boolean;
}

@InputType()
export class SocialLoginCallbackInput {
  @Field()
  provider!: string;

  @Field({ nullable: true })
  callbackURL?: string;

  @Field({ nullable: true })
  newUserCallbackURL?: string;

  @Field({ nullable: true })
  errorCallbackURL?: string;

  @Field({ nullable: true })
  requestSignUp?: boolean;

  @Field({ nullable: true })
  disableRedirect?: boolean;

  @Field(() => [String], { nullable: true })
  scopes?: string[];

  @Field({ nullable: true })
  loginHint?: string;

  @Field({ nullable: true })
  code?: string;

  @Field({ nullable: true })
  state?: string;

  @Field({ nullable: true })
  error?: string;

  @Field({ nullable: true })
  errorDescription?: string;

  @Field(() => SocialLoginIdTokenInput, { nullable: true })
  idToken?: SocialLoginIdTokenInput;
}

@InputType()
export class LinkSocialAccountInput {
  @Field()
  provider!: string;

  @Field({ nullable: true })
  callbackURL?: string;

  @Field({ nullable: true })
  errorCallbackURL?: string;

  @Field({ nullable: true })
  requestSignUp?: boolean;

  @Field({ nullable: true })
  disableRedirect?: boolean;

  @Field(() => [String], { nullable: true })
  scopes?: string[];

  @Field(() => SocialLoginIdTokenInput, { nullable: true })
  idToken?: SocialLoginIdTokenInput;
}

@InputType()
export class UnlinkSocialAccountInput {
  @Field()
  providerId!: string;

  @Field({ nullable: true })
  accountId?: string;
}

@ObjectType()
export class AuthAccessTokenResult {
  @Field()
  accessToken!: string;

  @Field(() => String, { nullable: true })
  refreshToken?: string;

  @Field(() => String, { nullable: true })
  tokenType?: string;

  @Field(() => String, { nullable: true })
  idToken?: string;

  @Field(() => Date, { nullable: true })
  accessTokenExpiresAt?: Date;

  @Field(() => Date, { nullable: true })
  refreshTokenExpiresAt?: Date;

  @Field(() => [String], { nullable: true })
  scopes?: string[];
}

@InputType({ description: 'Input used to fetch or refresh an OAuth access token.' })
export class OAuthTokenInput {
  @Field()
  providerId!: string;

  @Field({ nullable: true })
  accountId?: string;

  @Field({ nullable: true })
  userId?: string;
}

@InputType()
export class VerifyEmailInput {
  @Field()
  token!: string;

  @Field({ nullable: true })
  callbackURL?: string;
}

@InputType()
export class SendVerificationEmailInput {
  @Field()
  email!: string;

  @Field({ nullable: true })
  callbackURL?: string;
}
