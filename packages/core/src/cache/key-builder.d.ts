type CacheKeyPrimitive = string | number | boolean | null | undefined;
type CacheKeyObject = {
    [key: string]: CacheKeyPart;
};
type CacheKeyArray = CacheKeyPart[];
export type CacheKeyPart = CacheKeyPrimitive | CacheKeyObject | CacheKeyArray;
/**
 * Produce a stable, stringified cache key from structured inputs.
 */
export declare const buildCacheKey: (...parts: CacheKeyPart[]) => string;
export {};
//# sourceMappingURL=key-builder.d.ts.map