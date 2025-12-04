export enum Scope {
  SINGLETON = 'singleton',
  REQUEST = 'request',
  TRANSIENT = 'transient',
}

export type ContextId = symbol;

export const DEFAULT_CONTEXT_ID: ContextId = Symbol.for('nl:context:default');

let contextSequence = 0;

export const createContextId = (label?: string): ContextId => {
  const suffix = label?.trim() ? label.trim() : `${++contextSequence}`;
  return Symbol(`nl:context:${suffix}`);
};
