import type { RequestContext } from '@nl-framework/http';

export interface BetterAuthHttpTrustedProxyOptions {
  hosts?: string | string[];
  protocols?: string | string[];
}

export interface BetterAuthHttpCorsOptions {
  allowOrigin?: string | ((context: RequestContext) => string | null | undefined);
  allowHeaders?:
    | string
    | string[]
    | ((context: RequestContext) => string | string[] | null | undefined);
  allowMethods?:
    | string
    | string[]
    | ((context: RequestContext) => string | string[] | null | undefined);
  allowCredentials?: boolean;
  exposeHeaders?: string | string[];
  maxAge?: number;
}

export interface BetterAuthHttpOptions {
  prefix?: string;
  handleOptions?: boolean;
  cors?: BetterAuthHttpCorsOptions;
  trustedProxy?: BetterAuthHttpTrustedProxyOptions;
}

export interface NormalizedBetterAuthHttpOptions {
  prefix: string;
  handleOptions: boolean;
  cors: {
    allowOrigin(context: RequestContext): string;
    allowHeaders(context: RequestContext): string;
    allowMethods(context: RequestContext): string;
    allowCredentials: boolean;
    exposeHeaders?: string;
    maxAge?: number;
  };
  trustedProxy: {
    protocols: ('http' | 'https')[];
    hosts: string[] | null;
  };
}

const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\s]/u;
const INVALID_HOST_CHAR_PATTERN = /[\/#?]/;
const DEFAULT_TRUSTED_PROTOCOLS: ('http' | 'https')[] = ['http', 'https'];

const normalizePrefix = (value?: string): string => {
  if (!value) {
    return '/api/auth';
  }

  let prefix = value.trim();
  if (!prefix.startsWith('/')) {
    prefix = `/${prefix}`;
  }
  if (prefix.length > 1 && prefix.endsWith('/')) {
    prefix = prefix.slice(0, -1);
  }
  return prefix;
};

const normalizeValue = (
  value:
    | string
    | string[]
    | ((context: RequestContext) => string | string[] | null | undefined)
    | null
    | undefined,
  fallback: string,
): ((context: RequestContext) => string) => {
  if (typeof value === 'function') {
    return (context: RequestContext) => {
      const result = value(context);
      if (!result) {
        return fallback;
      }
      if (Array.isArray(result)) {
        return result.join(',');
      }
      return result;
    };
  }

  if (Array.isArray(value)) {
    const joined = value.join(',');
    return () => joined;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const trimmed = value.trim();
    return () => trimmed;
  }

  return () => fallback;
};

const normalizeExposeHeaders = (value?: string | string[]): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.join(',');
  }

  return value;
};

const ensureArray = (value?: string | string[]): string[] => {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const sanitizeProtocol = (value: string): 'http' | 'https' | undefined => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'http' || normalized === 'https') {
    return normalized;
  }
  return undefined;
};

const sanitizeHost = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 255) {
    return undefined;
  }
  if (CONTROL_CHAR_PATTERN.test(trimmed) || INVALID_HOST_CHAR_PATTERN.test(trimmed)) {
    return undefined;
  }

  try {
    const url = new URL(`http://${trimmed}`);
    const host = url.host;
    return host ? host.toLowerCase() : undefined;
  } catch {
    return undefined;
  }
};

const normalizeTrustedProxyProtocols = (
  value?: string | string[],
): ('http' | 'https')[] => {
  const normalized = ensureArray(value)
    .map(sanitizeProtocol)
    .filter((protocol): protocol is 'http' | 'https' => Boolean(protocol));
  const unique = Array.from(new Set(normalized));
  return unique.length ? unique : DEFAULT_TRUSTED_PROTOCOLS;
};

const normalizeTrustedProxyHosts = (value?: string | string[]): string[] | null => {
  const normalized = ensureArray(value)
    .map(sanitizeHost)
    .filter((host): host is string => Boolean(host));
  const unique = Array.from(new Set(normalized));
  return unique.length ? unique : null;
};

export const normalizeBetterAuthHttpOptions = (
  options: BetterAuthHttpOptions = {},
): NormalizedBetterAuthHttpOptions => {
  const prefix = normalizePrefix(options.prefix);
  const handleOptions = options.handleOptions ?? true;

  const cors = options.cors ?? {};
  const allowOrigin = normalizeValue(
    cors.allowOrigin ?? ((context: RequestContext) => context.request.headers.get('origin')),
    '*',
  );
  const allowHeaders = normalizeValue(
    cors.allowHeaders ??
      ((context: RequestContext) => context.request.headers.get('access-control-request-headers')),
    '*',
  );
  const allowMethods = normalizeValue(
    cors.allowMethods ??
      ((context: RequestContext) => context.request.headers.get('access-control-request-method')),
    'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD',
  );

  return {
    prefix,
    handleOptions,
    cors: {
      allowOrigin,
      allowHeaders,
      allowMethods,
      allowCredentials: cors.allowCredentials ?? true,
      exposeHeaders: normalizeExposeHeaders(cors.exposeHeaders),
      maxAge: cors.maxAge,
    },
    trustedProxy: {
      protocols: normalizeTrustedProxyProtocols(options.trustedProxy?.protocols),
      hosts: normalizeTrustedProxyHosts(options.trustedProxy?.hosts),
    },
  };
};
