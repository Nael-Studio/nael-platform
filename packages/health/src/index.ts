import 'reflect-metadata';

export { HealthModule } from './module';
export { HealthService, type HealthResponse } from './health.service';
// `HealthIndicator` is both a decorator (value) and the interface (type) —
// re-exported together from decorators.ts, mirroring the class+interface pattern.
export { HealthIndicator } from './decorators';
export {
  HEALTH_OPTIONS,
  HEALTH_SERVICE,
  HEALTH_INDICATOR_METADATA_KEY,
  DEFAULT_LIVENESS_PATH,
  DEFAULT_READINESS_PATH,
  DEFAULT_TIMEOUT_MS,
} from './constants';
export {
  isBindableIndicator,
  type HealthResult,
  type HealthStatus,
  type HealthReport,
  type HealthCheckContext,
  type HealthModuleOptions,
  type NormalizedHealthOptions,
  type BindableHealthIndicator,
} from './interfaces';
export { memoryIndicator, type MemoryIndicatorOptions } from './indicators/memory.indicator';
export { diskIndicator, type DiskIndicatorOptions } from './indicators/disk.indicator';
export { daprIndicator, type DaprIndicatorOptions } from './indicators/dapr.indicator';
export { mongoIndicator, type MongoIndicatorOptions } from './indicators/mongo.indicator';
export { redisIndicator, type RedisIndicatorOptions } from './indicators/redis.indicator';
