import type { HttpMethod, RequestContext } from '@nl-framework/http';
import { registerHttpRouteRegistrar } from '@nl-framework/http';
import type { NormalizedBetterAuthHttpOptions } from './options';
import type { BetterAuthService } from '../service';

const SUPPORTED_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

type BetterAuthApiEntry = {
  path?: string;
  options?: {
    method?: string | string[];
  };
};

type BetterAuthApiRegistry = Record<string, BetterAuthApiEntry> | BetterAuthApiEntry[];

type BetterAuthApi = {
  api?: BetterAuthApiRegistry;
};

const normalizePath = (prefix: string, path?: string): string => {
  const raw = path ?? '';
  const combined = `${prefix}${raw.startsWith('/') ? '' : '/'}${raw}`;
  const sanitized = combined.replace(/\/{2,}/g, '/');
  if (sanitized.length > 1 && sanitized.endsWith('/')) {
    return sanitized.slice(0, -1);
  }
  return sanitized || '/';
};

const reconstructRequest = (context: RequestContext): Request => {
  const original = context.request;
  const method = original.method.toUpperCase();

  if (method === 'GET' || method === 'HEAD') {
    return original;
  }

  let body: BodyInit | undefined;

  if (context.body instanceof Uint8Array) {
    body = context.body as unknown as BodyInit;
  } else if (context.body instanceof ArrayBuffer) {
    body = context.body;
  } else if (typeof context.body === 'string') {
    body = context.body;
  } else if (context.body !== null && context.body !== undefined) {
    body = JSON.stringify(context.body);
  }

  const headers = new Headers(original.headers);
  if (body && typeof body === 'string' && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return new Request(original.url, {
    method,
    headers,
    body,
  });
};

const appendVaryHeader = (headers: Headers, value: string): void => {
  const existing = headers.get('Vary');
  if (!existing) {
    headers.set('Vary', value);
    return;
  }

  const parts = existing.split(',').map((part) => part.trim());
  if (!parts.includes(value)) {
    headers.set('Vary', `${existing}, ${value}`);
  }
};

const applyCorsHeaders = (
  response: Response,
  context: RequestContext,
  cors: NormalizedBetterAuthHttpOptions['cors'],
): Response => {
  const headers = response.headers;
  const origin = cors.allowOrigin(context);
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  if (cors.allowCredentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
  if (cors.exposeHeaders) {
    headers.set('Access-Control-Expose-Headers', cors.exposeHeaders);
  }
  appendVaryHeader(headers, 'Origin');
  return response;
};

const createOptionsResponse = (
  context: RequestContext,
  cors: NormalizedBetterAuthHttpOptions['cors'],
): Response => {
  const headers = new Headers();

  const origin = cors.allowOrigin(context);
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
  }

  const allowedHeaders = cors.allowHeaders(context);
  if (allowedHeaders) {
    headers.set('Access-Control-Allow-Headers', allowedHeaders);
  }

  const allowedMethods = cors.allowMethods(context);
  if (allowedMethods) {
    headers.set('Access-Control-Allow-Methods', allowedMethods);
  }

  if (cors.allowCredentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  if (cors.exposeHeaders) {
    headers.set('Access-Control-Expose-Headers', cors.exposeHeaders);
  }

  if (cors.maxAge !== undefined) {
    headers.set('Access-Control-Max-Age', cors.maxAge.toString());
  }

  headers.set('Content-Length', '0');
  appendVaryHeader(headers, 'Origin');
  appendVaryHeader(headers, 'Access-Control-Request-Method');
  appendVaryHeader(headers, 'Access-Control-Request-Headers');

  return new Response(null, { status: 204, headers });
};

export const registerBetterAuthHttpRoutes = (
  service: BetterAuthService,
  options: NormalizedBetterAuthHttpOptions,
): void => {
  const betterAuth = service.instance as BetterAuthApi;

  registerHttpRouteRegistrar(async ({ registerRoute, logger }) => {
    const registry = Array.isArray(betterAuth.api)
      ? betterAuth.api
      : Object.values(betterAuth.api ?? {});

    const registered = new Set<string>();

    for (const entry of registry) {
      if (!entry?.path) {
        continue;
      }

      const methodsRaw = entry.options?.method;
      const methods = Array.isArray(methodsRaw)
        ? methodsRaw
        : methodsRaw
          ? [methodsRaw]
          : ['GET'];
      const fullPath = normalizePath(options.prefix, entry.path);
      const normalizedMethods = methods.map((method) => method.toUpperCase());

      for (const method of normalizedMethods) {
        const normalizedMethod = method as HttpMethod;
        if (!SUPPORTED_METHODS.includes(normalizedMethod)) {
          continue;
        }

        const dedupeKey = `${normalizedMethod} ${fullPath}`;
        if (registered.has(dedupeKey)) {
          continue;
        }

        registered.add(dedupeKey);
        registerRoute(normalizedMethod, fullPath, async (context) => {
          const request = reconstructRequest(context);
          const response = await service.handle(request);
          return applyCorsHeaders(response, context, options.cors);
        });
      }

      if (options.handleOptions && !normalizedMethods.includes('OPTIONS')) {
        const optionsKey = `OPTIONS ${fullPath}`;
        if (!registered.has(optionsKey)) {
          registered.add(optionsKey);
          registerRoute('OPTIONS', fullPath, (context) =>
            createOptionsResponse(context, options.cors),
          );
        }
      }
    }

    logger.info('Better Auth routes registered', {
      prefix: options.prefix,
      routes: registered.size,
    });
  });
};
