type CacheKeyPart = string | number | boolean | null | undefined | Record<string, unknown> | Array<unknown>;

const normalize = (part: CacheKeyPart): string | null => {
  if (part === undefined || part === null) {
    return null;
  }

  if (typeof part === 'string' || typeof part === 'number' || typeof part === 'boolean') {
    return String(part);
  }

  if (Array.isArray(part)) {
    return `[${part.map((item) => normalize(item)).filter(Boolean).join(',')}]`;
  }

  const entries = Object.keys(part)
    .sort()
    .map((key) => `${key}:${normalize((part as Record<string, unknown>)[key])}`);

  return `{${entries.join(',')}}`;
};

/**
 * Produce a stable, stringified cache key from structured inputs.
 */
export const buildCacheKey = (...parts: CacheKeyPart[]): string =>
  parts
    .map((part) => normalize(part))
    .filter((segment): segment is string => Boolean(segment))
    .join('|');
