import { ApplicationException } from './application-exception';

/**
 * Mapping of standard error codes to HTTP status codes
 */
export const ERROR_CODE_TO_HTTP_STATUS: Record<string, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Convert an ApplicationException to an HTTP status code
 */
export function getHttpStatusFromException(exception: ApplicationException): number {
  // If code is already a number, use it
  if (typeof exception.code === 'number') {
    return exception.code;
  }

  // Look up standard codes
  return ERROR_CODE_TO_HTTP_STATUS[exception.code] || 500;
}

/**
 * Create an ApplicationException with an HTTP status code
 */
export function createHttpException(
  status: number,
  message: string,
  details?: Record<string, any>,
  cause?: Error,
): ApplicationException {
  return new ApplicationException(status, message, details, cause);
}
