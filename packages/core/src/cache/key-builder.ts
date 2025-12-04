type CacheKeyPrimitive = string | number | boolean | null | undefined;
type CacheKeyObject = { [key: string]: CacheKeyPart };
type CacheKeyArray = CacheKeyPart[];
export type CacheKeyPart = CacheKeyPrimitive | CacheKeyObject | CacheKeyArray;

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

  const objectPart = part as CacheKeyObject;

  const entries = Object.keys(objectPart)
    .sort()
    .map((key) => `${key}:${normalize(objectPart[key])}`);

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
