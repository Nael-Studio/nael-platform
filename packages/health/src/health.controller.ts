import 'reflect-metadata';
import { Injectable, type ClassType } from '@nl-framework/core';
import { Get, PUBLIC_ROUTE_METADATA_KEY } from '@nl-framework/http';
import { HealthService, type HealthResponse } from './health.service';
import type { NormalizedHealthOptions } from './interfaces';

const toResponse = (result: HealthResponse): Response =>
  new Response(JSON.stringify(result.report), {
    status: result.statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

const applyGet = (controller: ClassType, methodName: string, path: string): void => {
  const descriptor = Object.getOwnPropertyDescriptor(controller.prototype, methodName);
  (Get(path) as MethodDecorator)(controller.prototype, methodName, descriptor as PropertyDescriptor);
};

const markPublic = (controller: ClassType, methodNames: string[]): void => {
  Reflect.defineMetadata(PUBLIC_ROUTE_METADATA_KEY, true, controller);
  for (const methodName of methodNames) {
    Reflect.defineMetadata(PUBLIC_ROUTE_METADATA_KEY, true, controller.prototype, methodName);
  }
};

/**
 * Build the internal health controller for the configured paths. It is marked
 * `@Public()` (via the shared HTTP metadata key) so a global `AuthGuard` exempts
 * the probes, and its routes are wired programmatically so paths stay
 * configurable.
 */
export const createHealthController = (options: NormalizedHealthOptions): ClassType => {
  class HealthController {
    constructor(private readonly service: HealthService) {}

    liveness(): Response {
      return toResponse(this.service.liveness());
    }

    async readiness(): Promise<Response> {
      return toResponse(await this.service.readiness());
    }
  }

  // Constructor injection of the HealthService (design:paramtypes is not emitted
  // for a class this file never decorates at the syntax level).
  Reflect.defineMetadata('design:paramtypes', [HealthService], HealthController);
  (Injectable() as ClassDecorator)(HealthController);

  const methodNames = ['liveness'];
  applyGet(HealthController, 'liveness', options.path);
  if (options.readinessPath) {
    applyGet(HealthController, 'readiness', options.readinessPath);
    methodNames.push('readiness');
  }

  markPublic(HealthController, methodNames);

  return HealthController;
};
