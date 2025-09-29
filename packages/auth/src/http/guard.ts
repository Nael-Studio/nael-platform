import { Inject, Injectable } from '@nl-framework/core';
import {
  registerHttpGuard,
  type CanActivate,
  type GuardDecision,
  type HttpExecutionContext,
} from '@nl-framework/http';
import { LoggerFactory, type Logger } from '@nl-framework/logger';
import { getRequestAuth, setRequestAuth } from './middleware';
import type { NormalizedBetterAuthHttpOptions } from './options';
import { BetterAuthService } from '../service';
import { isPublicRoute } from './public.decorator';
import { BETTER_AUTH_HTTP_OPTIONS } from './constants';

let authGuardRegistered = false;

const normalizePathname = (url: string): string => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger: Logger;

  constructor(
    private readonly authService: BetterAuthService,
    private readonly loggerFactory: LoggerFactory,
    @Inject(BETTER_AUTH_HTTP_OPTIONS) private readonly options: NormalizedBetterAuthHttpOptions,
  ) {
    this.logger = this.loggerFactory.create({ context: 'AuthGuard' });
  }

  async canActivate(context: HttpExecutionContext): Promise<GuardDecision> {
    const request = context.getRequest();

    if (request.method === 'OPTIONS') {
      return true;
    }

    const pathname = normalizePathname(request.url);
    if (pathname.startsWith(this.options.prefix)) {
      return true;
    }

    const route = context.getRoute();
    if (isPublicRoute(route.controller, route.handlerName)) {
      return true;
    }

    const requestContext = context.context;
    const snapshot = getRequestAuth(requestContext);
    if (snapshot) {
      return true;
    }

    const resolved = await this.authService.getSessionOrNull(request);
    if (resolved) {
      setRequestAuth(requestContext, resolved);
      return true;
    }

    this.logger.debug('Rejected unauthenticated request', {
      method: request.method,
      path: pathname,
    });

    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

export const registerAuthGuard = (): void => {
  if (authGuardRegistered) {
    return;
  }

  registerHttpGuard(AuthGuard);
  authGuardRegistered = true;
};

export const resetAuthGuard = (): void => {
  authGuardRegistered = false;
};
