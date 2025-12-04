const normalize = (part) => {
    if (part === undefined || part === null) {
        return null;
    }
    if (typeof part === 'string' || typeof part === 'number' || typeof part === 'boolean') {
        return String(part);
    }
    if (Array.isArray(part)) {
        return `[${part.map((item) => normalize(item)).filter(Boolean).join(',')}]`;
    }
    const objectPart = part;
    const entries = Object.keys(objectPart)
        .sort()
        .map((key) => `${key}:${normalize(objectPart[key])}`);
    return `{${entries.join(',')}}`;
};
/**
 * Produce a stable, stringified cache key from structured inputs.
 */
export const buildCacheKey = (...parts) => parts
    .map((part) => normalize(part))
    .filter((segment) => Boolean(segment))
    .join('|');
//# sourceMappingURL=key-builder.js.map