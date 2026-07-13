export interface CorsOptions {
  /**
   * Which origins are allowed. `'*'` allows any (not permitted with
   * `credentials: true`). A string/array is matched exactly; a RegExp is tested;
   * a function receives the request `Origin` and returns whether it is allowed.
   */
  origin: string | string[] | RegExp | ((origin: string) => boolean);
  /** Allowed methods for preflight. Defaults to the common verb set. */
  methods?: string[];
  /** Allowed request headers for preflight. Defaults to reflecting the request's `Access-Control-Request-Headers`. */
  headers?: string[];
  /** Send `Access-Control-Allow-Credentials: true`. Incompatible with `origin: '*'`. */
  credentials?: boolean;
  /** Preflight cache duration in seconds (`Access-Control-Max-Age`). */
  maxAge?: number;
  /** Response headers exposed to the browser (`Access-Control-Expose-Headers`). */
  exposeHeaders?: string[];
}

const DEFAULT_METHODS = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'];

/** Normalize the `cors` option; validates the credentials + wildcard rule. */
export const normalizeCorsOptions = (option: boolean | CorsOptions): CorsOptions | undefined => {
  if (!option) {
    return undefined;
  }
  const options: CorsOptions = option === true ? { origin: '*' } : option;
  if (options.credentials && options.origin === '*') {
    throw new Error(
      'CORS misconfiguration: `credentials: true` cannot be combined with `origin: "*"`. Specify explicit origin(s).',
    );
  }
  return options;
};

/**
 * Resolve the `Access-Control-Allow-Origin` value for a request, or `null` when
 * the origin is not allowed (no CORS headers should be emitted).
 */
export const resolveAllowedOrigin = (
  options: CorsOptions,
  requestOrigin: string | null,
): string | null => {
  const { origin } = options;
  if (origin === '*') {
    // Reflect the concrete origin when credentials are on (spec forbids `*`).
    return options.credentials ? requestOrigin : '*';
  }
  if (!requestOrigin) {
    return null;
  }
  const allowed =
    typeof origin === 'string'
      ? origin === requestOrigin
      : Array.isArray(origin)
        ? origin.includes(requestOrigin)
        : origin instanceof RegExp
          ? origin.test(requestOrigin)
          : origin(requestOrigin);
  return allowed ? requestOrigin : null;
};

const baseCorsHeaders = (
  options: CorsOptions,
  allowOrigin: string,
): Record<string, string> => {
  const headers: Record<string, string> = { 'Access-Control-Allow-Origin': allowOrigin };
  if (allowOrigin !== '*') {
    headers['Vary'] = 'Origin';
  }
  if (options.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
};

/** Whether a request is a CORS preflight (`OPTIONS` + `Access-Control-Request-Method`). */
export const isPreflight = (request: Request): boolean =>
  request.method.toUpperCase() === 'OPTIONS' &&
  request.headers.has('access-control-request-method');

/**
 * Build the 204 preflight response, or `null` when the origin is not allowed
 * (the caller should fall through to normal handling / 404).
 */
export const buildPreflightResponse = (
  options: CorsOptions,
  request: Request,
): Response | null => {
  const allowOrigin = resolveAllowedOrigin(options, request.headers.get('origin'));
  if (allowOrigin === null) {
    return null;
  }
  const headers = new Headers(baseCorsHeaders(options, allowOrigin));
  headers.set('Access-Control-Allow-Methods', (options.methods ?? DEFAULT_METHODS).join(', '));

  const requestedHeaders = request.headers.get('access-control-request-headers');
  const allowHeaders = options.headers?.join(', ') ?? requestedHeaders ?? '';
  if (allowHeaders) {
    headers.set('Access-Control-Allow-Headers', allowHeaders);
  }
  if (options.maxAge !== undefined) {
    headers.set('Access-Control-Max-Age', String(options.maxAge));
  }
  return new Response(null, { status: 204, headers });
};

/**
 * Apply CORS response headers to a resolved response. Returns the response
 * unchanged when there is no `Origin` header or the origin is disallowed.
 */
export const applyCorsHeaders = (
  options: CorsOptions,
  request: Request,
  response: Response,
): Response => {
  const requestOrigin = request.headers.get('origin');
  if (!requestOrigin) {
    return response;
  }
  const allowOrigin = resolveAllowedOrigin(options, requestOrigin);
  if (allowOrigin === null) {
    return response;
  }
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(baseCorsHeaders(options, allowOrigin))) {
    if (key === 'Vary') {
      const existing = headers.get('Vary');
      if (!existing) {
        headers.set('Vary', value);
      } else if (!existing.split(',').map((v) => v.trim().toLowerCase()).includes('origin')) {
        headers.set('Vary', `${existing}, Origin`);
      }
    } else {
      headers.set(key, value);
    }
  }
  if (options.exposeHeaders?.length) {
    headers.set('Access-Control-Expose-Headers', options.exposeHeaders.join(', '));
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
