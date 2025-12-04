import { ApplicationException } from './application-exception';
import { GraphQLError } from 'graphql';
/**
 * Mapping of standard error codes to GraphQL error codes
 */
export const ERROR_CODE_TO_GRAPHQL_CODE = {
    BAD_REQUEST: 'BAD_USER_INPUT',
    UNAUTHORIZED: 'UNAUTHENTICATED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    VALIDATION_ERROR: 'BAD_USER_INPUT',
    INTERNAL_ERROR: 'INTERNAL_SERVER_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
};
/**
 * Convert an ApplicationException to a GraphQL error code
 */
export function getGraphQLCodeFromException(exception) {
    if (typeof exception.code === 'string') {
        return ERROR_CODE_TO_GRAPHQL_CODE[exception.code] || exception.code;
    }
    // Convert HTTP status codes to GraphQL codes
    if (exception.code >= 400 && exception.code < 500) {
        return 'BAD_USER_INPUT';
    }
    return 'INTERNAL_SERVER_ERROR';
}
/**
 * Convert an ApplicationException to a GraphQL error
 */
export function toGraphQLError(exception) {
    return new GraphQLError(exception.message, {
        extensions: {
            code: getGraphQLCodeFromException(exception),
            details: exception.details,
            cause: exception.cause?.message,
        },
    });
}
/**
 * Create an ApplicationException with a GraphQL error code
 */
export function createGraphQLException(code, message, details, cause) {
    return new ApplicationException(code, message, details, cause);
}
//# sourceMappingURL=graphql-utils.js.map