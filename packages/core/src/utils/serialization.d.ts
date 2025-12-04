import { instanceToPlain, type ClassTransformOptions } from 'class-transformer';
type PlainValue = ReturnType<typeof instanceToPlain>;
/**
 * Serialize class instances or plain objects into JSON-friendly values.
 * Primitives, Responses, streams, and binary buffers are returned as-is.
 */
export declare const serialize: <T = unknown>(value: T, options?: ClassTransformOptions) => T | PlainValue;
export type SerializationOptions = ClassTransformOptions;
export {};
//# sourceMappingURL=serialization.d.ts.map