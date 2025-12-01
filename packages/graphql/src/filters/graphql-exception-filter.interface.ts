import type { GraphQLError } from 'graphql';
import type { ApplicationException } from '@nl-framework/core';

/**
 * Interface for GraphQL exception filters.
 * Filters can transform exceptions into GraphQL errors with custom formatting.
 */
export interface GraphQLExceptionFilter {
  /**
   * Catch and transform an exception into a GraphQL error
   * @param exception - The exception that was thrown
   * @param context - Additional context (operation, variables, etc.)
   * @returns A GraphQL error or null to use default handling
   */
  catch(exception: Error | ApplicationException, context?: any): GraphQLError | null | Promise<GraphQLError | null>;
}
