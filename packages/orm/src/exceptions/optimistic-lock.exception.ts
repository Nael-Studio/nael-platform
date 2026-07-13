import { ApplicationException } from '@nl-framework/core';

/**
 * Thrown when an optimistic-locking write (`@Version`) finds the document's
 * version has already advanced — i.e. someone else wrote it first. Maps to the
 * `CONFLICT` code (HTTP 409 / GraphQL `CONFLICT`).
 */
export class OptimisticLockException extends ApplicationException {
  constructor(
    public readonly entityName: string,
    public readonly expectedVersion: unknown,
    details?: Record<string, unknown>,
  ) {
    super(
      'CONFLICT',
      `${entityName} was modified concurrently (expected version ${String(expectedVersion)}).`,
      { entity: entityName, expectedVersion, ...details },
    );
    this.name = 'OptimisticLockException';
    Object.setPrototypeOf(this, OptimisticLockException.prototype);
  }
}
