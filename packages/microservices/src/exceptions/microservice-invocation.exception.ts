import { ApplicationException } from '@nl-framework/core';
import type { MessagePattern } from '../interfaces/transport';

/**
 * Thrown when a `send()` service invocation returns a non-2xx response. Carries
 * the HTTP status and raw response body so callers can inspect the failure.
 */
export class MicroserviceInvocationException extends ApplicationException {
  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly pattern?: MessagePattern,
  ) {
    super(status, `Microservice invocation failed with status ${status}`, { body, pattern });
    this.name = 'MicroserviceInvocationException';
    Object.setPrototypeOf(this, MicroserviceInvocationException.prototype);
  }
}
