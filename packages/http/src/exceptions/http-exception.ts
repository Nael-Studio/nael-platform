import { ApplicationException, getHttpStatusFromException } from '@nl-framework/core';

/**
 * HTTP-specific exception class that extends ApplicationException.
 * Automatically converts error codes to HTTP status codes.
 * 
 * @deprecated Use ApplicationException directly for better cross-transport compatibility.
 * This class is kept for backward compatibility.
 */
export class HttpException extends ApplicationException {
  constructor(
    public readonly status: number,
    message: string,
    public readonly cause?: Error,
  ) {
    super(status, message, undefined, cause);
    this.name = 'HttpException';
    Object.setPrototypeOf(this, HttpException.prototype);
  }

  static badRequest(message = 'Bad Request', cause?: Error): HttpException {
    return new HttpException(400, message, cause);
  }

  static unauthorized(message = 'Unauthorized', cause?: Error): HttpException {
    return new HttpException(401, message, cause);
  }

  static forbidden(message = 'Forbidden', cause?: Error): HttpException {
    return new HttpException(403, message, cause);
  }

  static notFound(message = 'Not Found', cause?: Error): HttpException {
    return new HttpException(404, message, cause);
  }

  static conflict(message = 'Conflict', cause?: Error): HttpException {
    return new HttpException(409, message, cause);
  }

  static unprocessableEntity(message = 'Unprocessable Entity', cause?: Error): HttpException {
    return new HttpException(422, message, cause);
  }

  static payloadTooLarge(message = 'Payload Too Large', cause?: Error): HttpException {
    return new PayloadTooLargeException(message, cause);
  }

  static unsupportedMediaType(message = 'Unsupported Media Type', cause?: Error): HttpException {
    return new UnsupportedMediaTypeException(message, cause);
  }

  static internalServerError(message = 'Internal Server Error', cause?: Error): HttpException {
    return new HttpException(500, message, cause);
  }

  static serviceUnavailable(message = 'Service Unavailable', cause?: Error): HttpException {
    return new HttpException(503, message, cause);
  }
}

/**
 * 413 — the request body (or an uploaded file) exceeds the allowed size.
 */
export class PayloadTooLargeException extends HttpException {
  constructor(message = 'Payload Too Large', cause?: Error) {
    super(413, message, cause);
    this.name = 'PayloadTooLargeException';
    Object.setPrototypeOf(this, PayloadTooLargeException.prototype);
  }
}

/**
 * 415 — the uploaded content type is not among the accepted MIME types.
 */
export class UnsupportedMediaTypeException extends HttpException {
  constructor(message = 'Unsupported Media Type', cause?: Error) {
    super(415, message, cause);
    this.name = 'UnsupportedMediaTypeException';
    Object.setPrototypeOf(this, UnsupportedMediaTypeException.prototype);
  }
}

/**
 * Helper to get HTTP status code from any ApplicationException
 */
export { getHttpStatusFromException };
