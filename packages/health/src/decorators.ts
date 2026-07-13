import { Injectable, SetMetadata, type CustomDecorator } from '@nl-framework/core';
import { HEALTH_INDICATOR_METADATA_KEY } from './constants';
import type { HealthIndicator as HealthIndicatorType } from './interfaces';

/**
 * The indicator interface, merged with the decorator below so a single
 * `HealthIndicator` name serves as both `implements HealthIndicator` (type) and
 * `@HealthIndicator()` (decorator).
 */
export type HealthIndicator = HealthIndicatorType;

/**
 * Mark a provider class as a health indicator. Registered providers carrying
 * this metadata are discovered through core's `DiscoveryService` and run for
 * readiness — no need to list them in the `indicators` array. The class must
 * implement `HealthIndicator` (`name` + `check()`).
 */
export const HealthIndicator = (): ClassDecorator =>
  ((target: object, context?: unknown) => {
    // Ensure the class is injectable, then tag it for discovery.
    (Injectable() as CustomDecorator)(target as never, context as never);
    return (SetMetadata(HEALTH_INDICATOR_METADATA_KEY, true) as CustomDecorator)(
      target as never,
      context as never,
    );
  }) as ClassDecorator;
