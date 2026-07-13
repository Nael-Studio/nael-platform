import type { Token } from '@nl-framework/core';
import type { MicroserviceExecutionContext } from './execution-context';

/**
 * A guard's verdict. `false` (or a rejected promise) denies the message;
 * `true`/`void` allows it. Unlike HTTP there is no `Response` form — a deny is
 * surfaced as `ApplicationException.forbidden()` (and dropped for pub/sub events).
 */
export type MicroserviceGuardDecision = void | boolean;

export interface MicroserviceCanActivate {
  canActivate(
    context: MicroserviceExecutionContext,
  ): MicroserviceGuardDecision | Promise<MicroserviceGuardDecision>;
}

export type MicroserviceGuardFunction = (
  context: MicroserviceExecutionContext,
) => MicroserviceGuardDecision | Promise<MicroserviceGuardDecision>;

export type MicroserviceGuardToken =
  | Token<MicroserviceCanActivate>
  | MicroserviceGuardFunction;
