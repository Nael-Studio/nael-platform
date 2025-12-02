/**
 * Base exception class for the NL Framework.
 * Can be used across all transport layers (HTTP, GraphQL, gRPC, etc.)
 */
export class ApplicationException extends Error {
    code;
    details;
    cause;
    constructor(
    /**
     * Error code - can be HTTP status code, GraphQL error code, or custom code
     */
    code, message, 
    /**
     * Additional error details or metadata
     */
    details, 
    /**
     * Original error that caused this exception
     */
    cause) {
        super(message);
        this.code = code;
        this.details = details;
        this.cause = cause;
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
    static badRequest(message = 'Bad Request', details, cause) {
        return new ApplicationException('BAD_REQUEST', message, details, cause);
    }
    static unauthorized(message = 'Unauthorized', details, cause) {
        return new ApplicationException('UNAUTHORIZED', message, details, cause);
    }
    static forbidden(message = 'Forbidden', details, cause) {
        return new ApplicationException('FORBIDDEN', message, details, cause);
    }
    static notFound(message = 'Not Found', details, cause) {
        return new ApplicationException('NOT_FOUND', message, details, cause);
    }
    static conflict(message = 'Conflict', details, cause) {
        return new ApplicationException('CONFLICT', message, details, cause);
    }
    static validationError(message = 'Validation Error', details, cause) {
        return new ApplicationException('VALIDATION_ERROR', message, details, cause);
    }
    static internalError(message = 'Internal Error', details, cause) {
        return new ApplicationException('INTERNAL_ERROR', message, details, cause);
    }
    static serviceUnavailable(message = 'Service Unavailable', details, cause) {
        return new ApplicationException('SERVICE_UNAVAILABLE', message, details, cause);
    }
    /**
     * Create a custom application exception with any code
     */
    static custom(code, message, details, cause) {
        return new ApplicationException(code, message, details, cause);
    }
}
//# sourceMappingURL=application-exception.js.map