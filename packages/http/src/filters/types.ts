import type { Token } from '@nl-framework/core';
import type { ExceptionFilter } from './exception-filter.interface';

export type ExceptionFilterToken = Token<ExceptionFilter> | ExceptionFilter;

