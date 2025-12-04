import type { RequestContext } from '../interfaces/http';
import {
  HttpGuardExecutionContext,
  createHttpGuardExecutionContext,
} from '../guards/execution-context';
import type { HttpExecutionContext } from '../guards/types';

export type HttpInterceptorExecutionContext = HttpExecutionContext;

export const createHttpInterceptorExecutionContext = (
  context: RequestContext,
): HttpInterceptorExecutionContext => createHttpGuardExecutionContext(context);

export { HttpGuardExecutionContext as HttpInterceptorContextBase } from '../guards/execution-context';
