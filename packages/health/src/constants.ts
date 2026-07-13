export const HEALTH_OPTIONS = Symbol.for('nl:health:options');
export const HEALTH_SERVICE = Symbol.for('nl:health:service');
export const HEALTH_INDICATOR_METADATA_KEY = Symbol.for('nl:health:indicator');

export const DEFAULT_LIVENESS_PATH = '/healthz';
export const DEFAULT_READINESS_PATH = '/readyz';
export const DEFAULT_TIMEOUT_MS = 3_000;
