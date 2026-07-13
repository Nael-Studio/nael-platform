export interface HstsOptions {
  /** `max-age` in seconds. */
  maxAge?: number;
  includeSubDomains?: boolean;
  preload?: boolean;
}

export interface SecurityOptions {
  /** `X-Content-Type-Options: nosniff`. Default on. */
  contentTypeOptions?: boolean;
  /** `X-Frame-Options`. Default `'DENY'`; pass `false` to omit. */
  frameOptions?: 'DENY' | 'SAMEORIGIN' | false;
  /** `Referrer-Policy`. Default `'no-referrer'`; pass `false` to omit. */
  referrerPolicy?: string | false;
  /**
   * `Strict-Transport-Security`. Off by default — never forced, so localhost dev
   * over HTTP is unaffected. Pass `true` for a one-year default or an object.
   */
  hsts?: boolean | HstsOptions;
  /** Optional `Content-Security-Policy` string, passed through verbatim. */
  csp?: string;
}

const ONE_YEAR_SECONDS = 31_536_000;

/** Normalize the `security` option to concrete defaults, or `undefined` when off. */
export const normalizeSecurityOptions = (
  option: boolean | SecurityOptions,
): SecurityOptions | undefined => {
  if (!option) {
    return undefined;
  }
  return option === true ? {} : option;
};

const buildHsts = (hsts: boolean | HstsOptions): string => {
  const opts: HstsOptions = typeof hsts === 'object' ? hsts : {};
  const parts = [`max-age=${opts.maxAge ?? ONE_YEAR_SECONDS}`];
  if (opts.includeSubDomains) {
    parts.push('includeSubDomains');
  }
  if (opts.preload) {
    parts.push('preload');
  }
  return parts.join('; ');
};

/** The security headers implied by the options, as a plain map. */
export const securityHeaders = (options: SecurityOptions): Record<string, string> => {
  const headers: Record<string, string> = {};
  if (options.contentTypeOptions !== false) {
    headers['X-Content-Type-Options'] = 'nosniff';
  }
  if (options.frameOptions !== false) {
    headers['X-Frame-Options'] = options.frameOptions ?? 'DENY';
  }
  if (options.referrerPolicy !== false) {
    headers['Referrer-Policy'] = options.referrerPolicy ?? 'no-referrer';
  }
  if (options.hsts) {
    headers['Strict-Transport-Security'] = buildHsts(options.hsts);
  }
  if (options.csp) {
    headers['Content-Security-Policy'] = options.csp;
  }
  return headers;
};

/**
 * Merge the security headers into a response. Handler-set headers always win —
 * a header the handler already set is never overwritten.
 */
export const applySecurityHeaders = (
  options: SecurityOptions,
  response: Response,
): Response => {
  const toAdd = securityHeaders(options);
  const headers = new Headers(response.headers);
  let changed = false;
  for (const [key, value] of Object.entries(toAdd)) {
    if (!headers.has(key)) {
      headers.set(key, value);
      changed = true;
    }
  }
  if (!changed) {
    return response;
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
