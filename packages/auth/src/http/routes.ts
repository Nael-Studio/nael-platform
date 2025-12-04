import type { HttpMethod, HttpRouteRegistrar, RequestContext } from '@nl-framework/http';
import { registerHttpRouteRegistrar } from '@nl-framework/http';
import type { NormalizedBetterAuthHttpOptions } from './options';
import type { BetterAuthService } from '../service';
import type { BetterAuthMultiTenantService } from '../multi-tenant.service';
import type { BetterAuthTenantResolution } from '../interfaces/multi-tenant-options';
import type { BetterAuthApi } from '../types';
import { resolveTrustedHost, sanitizeForwardedHost, sanitizeForwardedProtocol } from './forwarded-headers';

const SUPPORTED_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

type BetterAuthApiEntry = {
  path?: string;
  options?: {
    method?: string | string[];
  };
};

type BetterAuthApiRegistry = Record<string, BetterAuthApiEntry> | BetterAuthApiEntry[];

type BetterAuthRouteContainer = {
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

class RequestSerializationError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'RequestSerializationError';
  }
}

const resolveEffectiveUrl = (
  request: Request,
  options: NormalizedBetterAuthHttpOptions,
): string => {
  const current = new URL(request.url);

  const forwardedProtoHeader = request.headers.get('x-forwarded-proto') ?? undefined;
  const protocol = sanitizeForwardedProtocol(forwardedProtoHeader, options.trustedProxy.protocols);

  const hostHeader = request.headers.get('host') ?? current.host;
  const fallbackHost = sanitizeForwardedHost(hostHeader) ?? current.host;
  const forwardedHostHeader = request.headers.get('x-forwarded-host') ?? undefined;
  const forwardedHost = sanitizeForwardedHost(forwardedHostHeader);
  const host = resolveTrustedHost(forwardedHost, fallbackHost, options.trustedProxy.hosts);

  current.protocol = `${protocol}:`;
  current.host = host;
  return current.toString();
};

const reconstructRequest = (
  context: RequestContext,
  options: NormalizedBetterAuthHttpOptions,
): Request => {
  const original = context.request;
  const method = original.method.toUpperCase();

  if (method === 'GET' || method === 'HEAD') {
    return new Request(resolveEffectiveUrl(original, options), {
      method,
      headers: new Headers(original.headers),
    });
  }

  let body: BodyInit | undefined;

  if (context.body instanceof Uint8Array) {
    body = context.body as unknown as BodyInit;
  } else if (context.body instanceof ArrayBuffer) {
    body = context.body;
  } else if (typeof context.body === 'string') {
    body = context.body;
  } else if (context.body !== null && context.body !== undefined) {
    try {
      body = JSON.stringify(context.body);
    } catch (error) {
      throw new RequestSerializationError('Failed to serialize request body', error);
    }
  }

  const headers = new Headers(original.headers);
  if (body && typeof body === 'string' && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return new Request(resolveEffectiveUrl(original, options), {
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

export const createBetterAuthRouteRegistrar = (
  service: BetterAuthService,
  options: NormalizedBetterAuthHttpOptions,
): HttpRouteRegistrar => {
  const betterAuth = service.instance as BetterAuthRouteContainer;

  return async ({ registerRoute, logger }) => {
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
          try {
            const request = reconstructRequest(context, options);
            const response = await service.handle(request);
            return applyCorsHeaders(response, context, options.cors);
          } catch (error) {
            if (error instanceof RequestSerializationError) {
              logger.error('Failed to forward Better Auth request due to serialization error.', {
                method: normalizedMethod,
                path: fullPath,
                message: error.message,
              });

              const errorResponse = new Response(
                JSON.stringify({ message: 'Invalid request payload' }),
                {
                  status: 400,
                  headers: {
                    'Content-Type': 'application/json',
                  },
                },
              );

              return applyCorsHeaders(errorResponse, context, options.cors);
            }

            throw error;
          }
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
  };
};

export const registerBetterAuthHttpRoutes = (
  service: BetterAuthService,
  options: NormalizedBetterAuthHttpOptions,
): void => {
  registerHttpRouteRegistrar(createBetterAuthRouteRegistrar(service, options));
};

export const createBetterAuthMultiTenantRouteRegistrar = (
  service: BetterAuthMultiTenantService,
  options: NormalizedBetterAuthHttpOptions,
  bootstrapTenant: BetterAuthTenantResolution,
): HttpRouteRegistrar => {
  if (!bootstrapTenant?.tenantKey) {
    throw new Error(
      'createBetterAuthMultiTenantRouteRegistrar requires a bootstrap tenant (tenantKey) to discover Better Auth API routes.',
    );
  }

  return async ({ registerRoute, logger }) => {
    const instance = await service.getInstanceForTenant(bootstrapTenant);
    const betterAuth = instance as BetterAuthRouteContainer;
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
          try {
            const request = reconstructRequest(context, options);
            const tenantContext = { request, headers: request.headers };
            const response = await service.handle(request, tenantContext);
            return applyCorsHeaders(response, context, options.cors);
          } catch (error) {
            if (error instanceof RequestSerializationError) {
              logger.error('Failed to forward Better Auth request due to serialization error.', {
                method: normalizedMethod,
                path: fullPath,
                message: error.message,
              });

              const errorResponse = new Response(
                JSON.stringify({ message: 'Invalid request payload' }),
                {
                  status: 400,
                  headers: {
                    'Content-Type': 'application/json',
                  },
                },
              );

              return applyCorsHeaders(errorResponse, context, options.cors);
            }

            throw error;
          }
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

    logger.info('Better Auth multi-tenant routes registered', {
      prefix: options.prefix,
      routes: registered.size,
      bootstrapTenant: bootstrapTenant.tenantKey,
    });
  };
};

export const registerBetterAuthMultiTenantHttpRoutes = (
  service: BetterAuthMultiTenantService,
  options: NormalizedBetterAuthHttpOptions,
  bootstrapTenant: BetterAuthTenantResolution,
): void => {
  registerHttpRouteRegistrar(
    createBetterAuthMultiTenantRouteRegistrar(service, options, bootstrapTenant),
  );
};
