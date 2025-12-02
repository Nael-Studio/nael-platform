import { instanceToPlain } from 'class-transformer';
const isResponse = (value) => typeof Response !== 'undefined' && value instanceof Response;
const isReadableStream = (value) => typeof ReadableStream !== 'undefined' && value instanceof ReadableStream;
const isBinaryLike = (value) => value instanceof ArrayBuffer ||
    value instanceof Uint8Array ||
    (typeof Buffer !== 'undefined' && value instanceof Buffer);
const DEFAULT_SERIALIZATION_OPTIONS = {
    exposeDefaultValues: true,
};
/**
 * Serialize class instances or plain objects into JSON-friendly values.
 * Primitives, Responses, streams, and binary buffers are returned as-is.
 */
export const serialize = (value, options) => {
    if (value === null || typeof value !== 'object') {
        return value;
    }
    if (isResponse(value) || isReadableStream(value) || isBinaryLike(value)) {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => serialize(item, options));
    }
    const plainResult = instanceToPlain(value, {
        ...DEFAULT_SERIALIZATION_OPTIONS,
        ...options,
    });
    return plainResult;
};
//# sourceMappingURL=serialization.js.map