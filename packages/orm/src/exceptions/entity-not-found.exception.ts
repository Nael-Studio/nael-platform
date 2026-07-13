import { ApplicationException } from '@nl-framework/core';

/**
 * Thrown by the `*OrFail` repository helpers when no document matches the
 * requested filter. Carries the `NOT_FOUND` code so the existing HTTP/GraphQL
 * exception utilities map it to `404` / `NOT_FOUND` without extra wiring.
 */
export class EntityNotFoundException extends ApplicationException {
  constructor(
    public readonly entityName: string,
    filter: unknown,
    details?: Record<string, unknown>,
  ) {
    super('NOT_FOUND', `${entityName} not found matching ${summarizeFilter(filter)}`, {
      entity: entityName,
      filter: filter ?? {},
      ...details,
    });
    this.name = 'EntityNotFoundException';
    Object.setPrototypeOf(this, EntityNotFoundException.prototype);
  }
}

/**
 * Compact, log-safe rendering of a filter for the exception message. Keeps the
 * message short and never throws on circular / non-serializable input.
 */
function summarizeFilter(filter: unknown): string {
  if (filter === undefined || filter === null) {
    return '{}';
  }
  try {
    const json = JSON.stringify(filter);
    if (!json) {
      return String(filter);
    }
    return json.length > 200 ? `${json.slice(0, 197)}...` : json;
  } catch {
    return '[unserializable filter]';
  }
}
