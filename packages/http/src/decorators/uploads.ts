import { createHttpParamDecorator } from './params';
import type { RequestContext } from '../interfaces/http';
import { UploadedFileHandle, isUploadedFile } from '../uploads/uploaded-file';
import { PayloadTooLargeException, UnsupportedMediaTypeException, HttpException } from '../exceptions/http-exception';

export interface UploadValidationOptions {
  /** Maximum accepted file size in bytes. Larger files → 413. */
  maxSize?: number;
  /** Allowed MIME types (exact match). Others → 415. */
  mimeTypes?: string[];
  /** When true (default), a missing file throws 400. */
  required?: boolean;
}

/** Pull every `UploadedFileHandle` out of a parsed multipart body, in order. */
const collectFiles = (body: unknown): UploadedFileHandle[] => {
  if (!body || typeof body !== 'object') {
    return [];
  }
  const files: UploadedFileHandle[] = [];
  for (const value of Object.values(body as Record<string, unknown>)) {
    if (isUploadedFile(value)) {
      files.push(value);
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        if (isUploadedFile(entry)) {
          files.push(entry);
        }
      }
    }
  }
  return files;
};

/** Files posted under a specific field name (single or repeated). */
const filesForField = (body: unknown, field: string): UploadedFileHandle[] => {
  if (!body || typeof body !== 'object') {
    return [];
  }
  const value = (body as Record<string, unknown>)[field];
  if (isUploadedFile(value)) {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter(isUploadedFile);
  }
  return [];
};

const validateFile = (file: UploadedFileHandle, options?: UploadValidationOptions): void => {
  if (options?.maxSize !== undefined && file.size > options.maxSize) {
    throw new PayloadTooLargeException(
      `Uploaded file "${file.filename}" is ${file.size} bytes, exceeding the ${options.maxSize} byte limit.`,
    );
  }
  if (options?.mimeTypes?.length && !options.mimeTypes.includes(file.mimeType)) {
    throw new UnsupportedMediaTypeException(
      `Uploaded file "${file.filename}" has type "${file.mimeType || 'unknown'}"; expected one of ${options.mimeTypes.join(', ')}.`,
    );
  }
};

/**
 * Inject a single uploaded file from a `multipart/form-data` request.
 *
 * ```ts
 * @Post('avatar')
 * upload(@UploadedFile('avatar', { maxSize: 5_000_000, mimeTypes: ['image/png'] }) file: UploadedFileHandle) {}
 * ```
 *
 * When `field` is omitted the first file in the form is used. Violations throw
 * `PayloadTooLargeException` (413) / `UnsupportedMediaTypeException` (415); a
 * missing required file throws 400.
 */
export const UploadedFile = (
  field?: string,
  options?: UploadValidationOptions,
): ParameterDecorator =>
  createHttpParamDecorator((_: unknown, ctx: RequestContext) => {
    const candidates = field ? filesForField(ctx.body, field) : collectFiles(ctx.body);
    const file = candidates[0];
    if (!file) {
      if (options?.required === false) {
        // `null` (not `undefined`) so the router does not backfill the argument
        // with the RequestContext.
        return null;
      }
      throw HttpException.badRequest(
        field ? `Expected an uploaded file in field "${field}".` : 'Expected an uploaded file in the request.',
      );
    }
    validateFile(file, options);
    return file;
  })();

/**
 * Inject every uploaded file from a `multipart/form-data` request as an array.
 *
 * ```ts
 * @Post('gallery')
 * upload(@UploadedFiles({ maxSize: 5_000_000 }) files: UploadedFileHandle[]) {}
 * ```
 */
export const UploadedFiles = (options?: UploadValidationOptions): ParameterDecorator =>
  createHttpParamDecorator((_: unknown, ctx: RequestContext) => {
    const files = collectFiles(ctx.body);
    if (!files.length && options?.required !== false) {
      throw HttpException.badRequest('Expected at least one uploaded file in the request.');
    }
    for (const file of files) {
      validateFile(file, options);
    }
    return files;
  })();
