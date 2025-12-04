import { Inject, Injectable } from '@nl-framework/core';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import { BETTER_AUTH_INSTANCE } from './constants';
import type { BetterAuthInstance, BetterAuthSessionInput, BetterAuthSessionPayload } from './types';

export interface BetterAuthSessionOptions {
  disableCookieCache?: boolean;
  disableRefresh?: boolean;
}

type GetSessionParameters = BetterAuthSessionInput;

@Injectable()
export class BetterAuthService {
  private readonly logger: Logger;

  constructor(
    @Inject(BETTER_AUTH_INSTANCE) private readonly auth: BetterAuthInstance,
    loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory.create({ context: 'BetterAuthService' });
  }

  get instance(): BetterAuthInstance {
    return this.auth;
  }

  async handle(request: Request): Promise<Response> {
    return this.auth.handler(request);
  }

  async getSession(
    input: Request | Headers,
    options: BetterAuthSessionOptions = {},
  ): Promise<BetterAuthSessionPayload | null> {
    const headers = input instanceof Request ? input.headers : input;
    const query = options.disableCookieCache || options.disableRefresh
      ? {
        disableCookieCache: options.disableCookieCache,
        disableRefresh: options.disableRefresh,
      }
      : undefined;

    try {
      const args: GetSessionParameters = { headers } as GetSessionParameters;
      if (query) {
        (args as { query?: typeof query }).query = query;
      }

      const result = (await this.auth.api.getSession(args)) as BetterAuthSessionPayload | null;
      return result ?? null;
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error';
      this.logger.warn('Failed to resolve Better Auth session', { error: message });
      throw error;
    }
  }

  async getSessionOrNull(
    input: Request | Headers,
    options: BetterAuthSessionOptions = {},
  ): Promise<BetterAuthSessionPayload | null> {
    try {
      return await this.getSession(input, options);
    } catch {
      return null;
    }
  }
}
