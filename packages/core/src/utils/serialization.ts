import { instanceToPlain, type ClassTransformOptions } from 'class-transformer';

const isResponse = (value: unknown): value is Response =>
  typeof Response !== 'undefined' && value instanceof Response;

const isReadableStream = (value: unknown): value is ReadableStream =>
  typeof ReadableStream !== 'undefined' && value instanceof ReadableStream;

const isBinaryLike = (value: unknown): value is ArrayBuffer | Uint8Array | Buffer =>
  value instanceof ArrayBuffer ||
  value instanceof Uint8Array ||
  (typeof Buffer !== 'undefined' && value instanceof Buffer);

const DEFAULT_SERIALIZATION_OPTIONS: ClassTransformOptions = {
  exposeDefaultValues: true,
};

type PlainValue = ReturnType<typeof instanceToPlain>;

/**
 * Serialize class instances or plain objects into JSON-friendly values.
 * Primitives, Responses, streams, and binary buffers are returned as-is.
 */
export const serialize = <T = unknown>(
  value: T,
  options?: ClassTransformOptions,
): T | PlainValue => {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (isResponse(value) || isReadableStream(value) || isBinaryLike(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serialize(item, options)) as unknown as T;
  }

  const plainResult = instanceToPlain(value as object, {
    ...DEFAULT_SERIALIZATION_OPTIONS,
    ...options,
  }) as PlainValue;

  return plainResult;
};

export type SerializationOptions = ClassTransformOptions;
