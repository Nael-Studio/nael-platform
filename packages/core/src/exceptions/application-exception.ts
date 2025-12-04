/**
 * Base exception class for the NL Framework.
 * Can be used across all transport layers (HTTP, GraphQL, gRPC, etc.)
 */
export class ApplicationException extends Error {
  constructor(
    /**
     * Error code - can be HTTP status code, GraphQL error code, or custom code
     */
    public readonly code: string | number,
    message: string,
    /**
     * Additional error details or metadata
     */
    public readonly details?: Record<string, any>,
    /**
     * Original error that caused this exception
     */
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'ApplicationException';
    Object.setPrototypeOf(this, ApplicationException.prototype);
  }

  /**
   * Convert to a plain object for serialization
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      cause: this.cause?.message,
    };
  }

  // Common application errors (transport-agnostic)

  static badRequest(message = 'Bad Request', details?: Record<string, any>, cause?: Error): ApplicationException {
    return new ApplicationException('BAD_REQUEST', message, details, cause);
  }

  static unauthorized(message = 'Unauthorized', details?: Record<string, any>, cause?: Error): ApplicationException {
    return new ApplicationException('UNAUTHORIZED', message, details, cause);
  }

  static forbidden(message = 'Forbidden', details?: Record<string, any>, cause?: Error): ApplicationException {
    return new ApplicationException('FORBIDDEN', message, details, cause);
  }

  static notFound(message = 'Not Found', details?: Record<string, any>, cause?: Error): ApplicationException {
    return new ApplicationException('NOT_FOUND', message, details, cause);
  }

  static conflict(message = 'Conflict', details?: Record<string, any>, cause?: Error): ApplicationException {
    return new ApplicationException('CONFLICT', message, details, cause);
  }

  static validationError(message = 'Validation Error', details?: Record<string, any>, cause?: Error): ApplicationException {
    return new ApplicationException('VALIDATION_ERROR', message, details, cause);
  }

  static internalError(message = 'Internal Error', details?: Record<string, any>, cause?: Error): ApplicationException {
    return new ApplicationException('INTERNAL_ERROR', message, details, cause);
  }

  static serviceUnavailable(message = 'Service Unavailable', details?: Record<string, any>, cause?: Error): ApplicationException {
    return new ApplicationException('SERVICE_UNAVAILABLE', message, details, cause);
  }

  /**
   * Create a custom application exception with any code
   */
  static custom(code: string | number, message: string, details?: Record<string, any>, cause?: Error): ApplicationException {
    return new ApplicationException(code, message, details, cause);
  }
}
