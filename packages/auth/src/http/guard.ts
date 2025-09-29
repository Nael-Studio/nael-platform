import { Inject, Injectable } from '@nl-framework/core';
import {
  registerHttpGuard,
  type CanActivate,
  type GuardDecision,
  type HttpExecutionContext,
} from '@nl-framework/http';
import {
  registerGraphqlGuard,
  type GraphqlExecutionContext,
  type GraphqlContext,
} from '@nl-framework/graphql';
import { LoggerFactory, type Logger } from '@nl-framework/logger';
import type { IncomingMessage } from 'node:http';
import { getRequestAuth, setRequestAuth } from './middleware';
import type { NormalizedBetterAuthHttpOptions } from './options';
import { BetterAuthService } from '../service';
import type { BetterAuthSessionPayload } from '../types';
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

const isHttpContext = (context: unknown): context is HttpExecutionContext =>
  Boolean(context) && typeof (context as HttpExecutionContext).getRequest === 'function';

const isGraphqlContext = (context: unknown): context is GraphqlExecutionContext =>
  Boolean(context) && typeof (context as GraphqlExecutionContext).getContext === 'function';

const GRAPHQL_AUTH_STATE = Symbol.for('@nl-framework/auth/request-state');

const getGraphqlAuth = (context: GraphqlContext): BetterAuthSessionPayload | null =>
  ((context as { [GRAPHQL_AUTH_STATE]?: BetterAuthSessionPayload | null })[GRAPHQL_AUTH_STATE] ?? null);

const setGraphqlAuth = (context: GraphqlContext, payload: BetterAuthSessionPayload | null): void => {
  (context as { [GRAPHQL_AUTH_STATE]?: BetterAuthSessionPayload | null })[GRAPHQL_AUTH_STATE] = payload;
  (context as { auth?: BetterAuthSessionPayload | null }).auth = payload;
};

const createRequestFromIncomingMessage = (req: IncomingMessage): Request => {
  const protoHeader = req.headers['x-forwarded-proto'];
  const protocol = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader ?? 'http';

  const hostHeader = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost';
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;

  const url = req.url ?? '/graphql';
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  const fullUrl = `${protocol}://${host}${normalizedPath}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        headers.append(key, entry);
      }
    } else {
      headers.set(key, value);
    }
  }

  return new Request(fullUrl, {
    method: req.method ?? 'POST',
    headers,
  });
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

  async canActivate(context: HttpExecutionContext | GraphqlExecutionContext): Promise<GuardDecision> {
    if (isHttpContext(context)) {
      return this.handleHttp(context);
    }

    if (isGraphqlContext(context)) {
      return this.handleGraphql(context);
    }

    throw new Error('AuthGuard received an unsupported execution context.');
  }

  private unauthorizedResponse(): Response {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async handleHttp(context: HttpExecutionContext): Promise<GuardDecision> {
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

    return this.unauthorizedResponse();
  }

  private async handleGraphql(context: GraphqlExecutionContext): Promise<GuardDecision> {
    const resolverClass = context.getResolverClass();
    const handlerName = context.getResolverHandlerName();

    if (resolverClass && isPublicRoute(resolverClass, handlerName)) {
      return true;
    }

    const gqlContext = context.getContext();
    const existing = getGraphqlAuth(gqlContext);
    if (existing) {
      return true;
    }

    const requestSource = gqlContext.req;
    if (!requestSource) {
      this.logger.warn('GraphQL guard could not locate the incoming request on the context.');
      return this.unauthorizedResponse();
    }

    const request = createRequestFromIncomingMessage(requestSource);
    const resolved = await this.authService.getSessionOrNull(request);
    if (resolved) {
      setGraphqlAuth(gqlContext, resolved);
      return true;
    }

    const info = context.getInfo();
    this.logger.debug('Rejected unauthenticated GraphQL request', {
      field: info.fieldName,
      parentType: info.parentType?.name,
    });

    return this.unauthorizedResponse();
  }
}

export const registerAuthGuard = (): void => {
  if (authGuardRegistered) {
    return;
  }

  registerHttpGuard(AuthGuard);
  registerGraphqlGuard(AuthGuard);
  authGuardRegistered = true;
};

export const resetAuthGuard = (): void => {
  authGuardRegistered = false;
};
