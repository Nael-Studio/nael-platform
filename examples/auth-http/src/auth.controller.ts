import { Controller } from '@nl-framework/core';
import { Post, type RequestContext } from '@nl-framework/http';
import { BetterAuthService } from '@nl-framework/auth';
import { LoggerFactory, type Logger } from '@nl-framework/logger';
import type { DefaultUserConfig } from './types';

interface LoginPayload {
  email?: string;
  password?: string;
}

@Controller('auth')
export class AuthController {
  private readonly logger: Logger;

  constructor(private readonly authService: BetterAuthService, loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.create({ context: 'AuthController' });
  }

  @Post('login')
  async login(ctx: RequestContext) {
    const payload = await this.safeParseBody<LoginPayload>(ctx);
    if (!payload?.email || !payload?.password) {
      return new Response(
        JSON.stringify({ message: 'Request body must include email and password fields.' }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    try {
      const session = await this.authService.signIn({
        email: payload.email,
        password: payload.password,
      });

      return Response.json({
        message: 'Logged in successfully.',
        session: {
          sessionId: session.sessionId,
          token: session.token,
          expiresAt: session.expiresAt,
          roles: session.roles,
        },
      });
    } catch (error) {
      this.logger.warn('Login attempt failed', {
        email: payload.email,
        error: error instanceof Error ? error.message : String(error),
      });
      return new Response(JSON.stringify({ message: 'Invalid credentials.' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
  }

  @Post('register')
  async register(ctx: RequestContext) {
    const payload = await this.safeParseBody<DefaultUserConfig>(ctx);
    if (!payload?.email || !payload?.password) {
      return new Response(
        JSON.stringify({ message: 'Request body must include email and password fields.' }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    try {
      const user = await this.authService.registerUser({
        email: payload.email,
        password: payload.password,
        roles: payload.roles,
      });

      return new Response(
        JSON.stringify({
          message: 'User registered.',
          user: {
            id: user.id,
            email: user.email,
            roles: user.roles,
          },
        }),
        {
          status: 201,
          headers: { 'content-type': 'application/json' },
        },
      );
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Registration failed.';
      this.logger.error('Failed to register user', error instanceof Error ? error : undefined, {
        email: payload.email,
      });
      return new Response(JSON.stringify({ message: description }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }
  }

  private async safeParseBody<T>(ctx: RequestContext): Promise<T | null> {
    try {
      return (await ctx.request.json()) as T;
    } catch (error) {
      this.logger.warn('Failed to parse request body as JSON', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}
