import type { GraphQLExceptionFilter } from './graphql-exception-filter.interface';

/**
 * Global GraphQL exception filters registry
 */
let globalGraphQLExceptionFilters: GraphQLExceptionFilter[] = [];

/**
 * Register a global GraphQL exception filter
 */
export function registerGraphQLExceptionFilter(filter: GraphQLExceptionFilter): void {
  globalGraphQLExceptionFilters.push(filter);
}

/**
 * Register multiple global GraphQL exception filters
 */
export function registerGraphQLExceptionFilters(filters: GraphQLExceptionFilter[]): void {
  globalGraphQLExceptionFilters.push(...filters);
}

/**
 * Get all registered GraphQL exception filters
 */
export function listGraphQLExceptionFilters(): GraphQLExceptionFilter[] {
  return [...globalGraphQLExceptionFilters];
}

/**
 * Clear all registered GraphQL exception filters
 */
export function clearGraphQLExceptionFilters(): void {
  globalGraphQLExceptionFilters = [];
}
