/**
 * Base exception class for the NL Framework.
 * Can be used across all transport layers (HTTP, GraphQL, gRPC, etc.)
 */
export declare class ApplicationException extends Error {
    /**
     * Error code - can be HTTP status code, GraphQL error code, or custom code
     */
    readonly code: string | number;
    /**
     * Additional error details or metadata
     */
    readonly details?: Record<string, any> | undefined;
    /**
     * Original error that caused this exception
     */
    readonly cause?: Error | undefined;
    constructor(
    /**
     * Error code - can be HTTP status code, GraphQL error code, or custom code
     */
    code: string | number, message: string, 
    /**
     * Additional error details or metadata
     */
    details?: Record<string, any> | undefined, 
    /**
     * Original error that caused this exception
     */
    cause?: Error | undefined);
    /**
     * Convert to a plain object for serialization
     */
    toJSON(): {
        name: string;
        code: string | number;
        message: string;
        details: Record<string, any> | undefined;
        cause: string | undefined;
    };
    static badRequest(message?: string, details?: Record<string, any>, cause?: Error): ApplicationException;
    static unauthorized(message?: string, details?: Record<string, any>, cause?: Error): ApplicationException;
    static forbidden(message?: string, details?: Record<string, any>, cause?: Error): ApplicationException;
    static notFound(message?: string, details?: Record<string, any>, cause?: Error): ApplicationException;
    static conflict(message?: string, details?: Record<string, any>, cause?: Error): ApplicationException;
    static validationError(message?: string, details?: Record<string, any>, cause?: Error): ApplicationException;
    static internalError(message?: string, details?: Record<string, any>, cause?: Error): ApplicationException;
    static serviceUnavailable(message?: string, details?: Record<string, any>, cause?: Error): ApplicationException;
    /**
     * Create a custom application exception with any code
     */
    static custom(code: string | number, message: string, details?: Record<string, any>, cause?: Error): ApplicationException;
}
//# sourceMappingURL=application-exception.d.ts.map