import type { Token } from '@nl-framework/core';
import type { GraphQLExceptionFilter } from './graphql-exception-filter.interface';

export type GraphqlExceptionFilterToken = Token<GraphQLExceptionFilter> | GraphQLExceptionFilter;

