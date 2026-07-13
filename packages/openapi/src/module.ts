import { Module, type ClassType, type Provider } from '@nl-framework/core';
import { OPENAPI_OPTIONS } from './constants';
import { normalizeOpenApiOptions, type OpenApiModuleOptions } from './options';
import { ensureOpenApiIntegration } from './http/registrar';

export class OpenApiModule {
  /**
   * Register OpenAPI generation. Mounts the JSON document (default
   * `/openapi.json`) plus a self-contained viewer (default `/docs`, pass
   * `ui: false` to disable) on the existing HTTP router. The document is built
   * once at boot from route/DTO metadata and cached.
   */
  static forRoot(options: OpenApiModuleOptions): ClassType {
    const normalized = normalizeOpenApiOptions(options);

    const optionsProvider: Provider = {
      provide: OPENAPI_OPTIONS,
      useValue: normalized,
    };

    ensureOpenApiIntegration();

    @Module({
      providers: [optionsProvider],
      exports: [OPENAPI_OPTIONS],
    })
    class OpenApiRootModule {}

    return OpenApiRootModule;
  }
}
