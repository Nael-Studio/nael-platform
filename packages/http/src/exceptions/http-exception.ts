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

  static internalServerError(message = 'Internal Server Error', cause?: Error): HttpException {
    return new HttpException(500, message, cause);
  }

  static serviceUnavailable(message = 'Service Unavailable', cause?: Error): HttpException {
    return new HttpException(503, message, cause);
  }
}

/**
 * Helper to get HTTP status code from any ApplicationException
 */
export { getHttpStatusFromException };
