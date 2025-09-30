import type { GraphqlContext } from '@nl-framework/graphql';
import { GraphQLError } from 'graphql';
import type { NormalizedBetterAuthHttpOptions } from '../http/options';

const ensureLeadingSlash = (value: string): string => (value.startsWith('/') ? value : `/${value}`);

const trimTrailingSlash = (value: string): string => {
  if (value.length > 1 && value.endsWith('/')) {
    return value.slice(0, -1);
  }
  return value;
};

const joinPath = (base: string, path: string): string => {
  const normalizedBase = trimTrailingSlash(ensureLeadingSlash(base));
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  if (normalizedBase === '/') {
    return normalizedPath || '/';
  }
  return `${normalizedBase}${normalizedPath}`;
};

const resolveOrigin = (context: GraphqlContext): string => {
  const request = (context as { request?: Request }).request;
  if (request) {
    try {
      const url = new URL(request.url);
      return `${url.protocol}//${url.host}`;
    } catch {
      /* ignore */
    }
  }
  return 'http://127.0.0.1:4201';
};

export interface BetterAuthGraphqlRequestOptions {
  context: GraphqlContext;
  httpOptions: NormalizedBetterAuthHttpOptions;
  path: string;
  method: string;
  body?: unknown;
}

export const createBetterAuthRequest = ({
  context,
  httpOptions,
  path,
  method,
  body,
}: BetterAuthGraphqlRequestOptions): Request => {
  const origin = resolveOrigin(context);
  const prefix = httpOptions.prefix ?? '/api/auth';
  const target = `${origin}${joinPath(prefix, path)}`;

  const headers = new Headers();
  const request = (context as { request?: Request }).request;

  if (request) {
    const forwardHeaders = ['cookie', 'authorization', 'user-agent'];
    for (const header of forwardHeaders) {
      const value = request.headers.get(header);
      if (value) {
        headers.set(header, value);
      }
    }
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      headers.set('x-forwarded-for', forwardedFor);
    }
    const forwardedProto = request.headers.get('x-forwarded-proto');
    if (forwardedProto) {
      headers.set('x-forwarded-proto', forwardedProto);
    }
  }

  if (body !== undefined && body !== null) {
    headers.set('content-type', 'application/json');
  }

  const init: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined && body !== null) {
    init.body = JSON.stringify(body);
  }

  return new Request(target, init);
};

export const forwardBetterAuthHeaders = (
  context: GraphqlContext,
  response: Response,
): void => {
  const res = (context as { res?: { setHeader?: (name: string, value: string | string[]) => void } }).res;
  if (!res || typeof res.setHeader !== 'function') {
    return;
  }

  const raw = (response.headers as unknown as { raw?: () => Record<string, string[]> }).raw?.();
  const setCookie = raw?.['set-cookie'];
  if (Array.isArray(setCookie) && setCookie.length) {
    res.setHeader('Set-Cookie', setCookie);
    return;
  }

  const header = response.headers.get('set-cookie');
  if (header) {
    res.setHeader('Set-Cookie', header);
  }
};

const extractErrorMessage = async (response: Response): Promise<string | undefined> => {
  try {
    const data = await response.clone().json();
    if (data && typeof data === 'object' && 'message' in data) {
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

export interface BetterAuthInvokeOptions extends BetterAuthGraphqlRequestOptions {
  expectJson?: boolean;
  errorMessage?: string;
}

export const invokeBetterAuth = async <T = unknown>({
  context,
  httpOptions,
  path,
  method,
  body,
  expectJson = true,
  errorMessage,
}: BetterAuthInvokeOptions): Promise<T | null> => {
  const request = createBetterAuthRequest({ context, httpOptions, path, method, body });
  const response = await fetch(request);

  forwardBetterAuthHeaders(context, response);

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new GraphQLError(message ?? errorMessage ?? 'Better Auth request failed', {
      extensions: {
        code: 'BETTER_AUTH_ERROR',
        httpStatus: response.status,
      },
    });
  }

  if (!expectJson) {
    return null;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
};
