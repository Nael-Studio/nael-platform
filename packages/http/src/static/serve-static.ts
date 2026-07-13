import { resolve, sep } from 'node:path';

export interface ServeStaticOptions {
  /** URL prefix these files are served under, e.g. `/assets`. */
  prefix: string;
  /** Filesystem directory to serve from. */
  root: string;
  /** `Cache-Control: public, max-age=<seconds>` when set. */
  maxAge?: number;
}

/** Weak-ish ETag derived from size + mtime, matching common static servers. */
const buildEtag = (size: number, mtimeMs: number): string => `"${size.toString(16)}-${Math.floor(mtimeMs).toString(16)}"`;

const normalizePrefix = (prefix: string): string => {
  let p = prefix.startsWith('/') ? prefix : `/${prefix}`;
  if (p.length > 1 && p.endsWith('/')) {
    p = p.slice(0, -1);
  }
  return p;
};

/**
 * Build a static-file handler. Returns a function that resolves a request to a
 * file `Response`, or `null` when the request is outside this mount (so the
 * caller can fall through to routing). Path traversal outside `root` yields a
 * 404 (never a file outside root).
 */
export const createStaticFileServer = (
  options: ServeStaticOptions,
): ((request: Request) => Promise<Response | null>) => {
  const prefix = normalizePrefix(options.prefix);
  const rootAbs = resolve(options.root);

  return async (request: Request): Promise<Response | null> => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return null;
    }

    const pathname = new URL(request.url).pathname;
    if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
      return null;
    }

    let relative: string;
    try {
      relative = decodeURIComponent(pathname.slice(prefix.length));
    } catch {
      return new Response('Not Found', { status: 404 });
    }

    // Resolve against root and confirm the result stays inside root.
    const target = resolve(rootAbs, `.${relative.startsWith('/') ? relative : `/${relative}`}`);
    if (target !== rootAbs && !target.startsWith(rootAbs + sep)) {
      return new Response('Not Found', { status: 404 });
    }

    const file = Bun.file(target);
    if (!(await file.exists())) {
      return null;
    }

    const etag = buildEtag(file.size, file.lastModified);
    const headers = new Headers({ etag });
    if (file.type) {
      headers.set('content-type', file.type);
    }
    if (options.maxAge !== undefined) {
      headers.set('cache-control', `public, max-age=${options.maxAge}`);
    }

    if (request.headers.get('if-none-match') === etag) {
      return new Response(null, { status: 304, headers });
    }

    if (request.method === 'HEAD') {
      headers.set('content-length', String(file.size));
      return new Response(null, { status: 200, headers });
    }

    return new Response(file, { status: 200, headers });
  };
};
