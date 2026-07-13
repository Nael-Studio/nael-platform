import 'reflect-metadata';

export { OpenApiModule } from './module';
export { OPENAPI_OPTIONS } from './constants';
export {
  normalizeOpenApiOptions,
  type OpenApiModuleOptions,
  type NormalizedOpenApiOptions,
} from './options';
export {
  buildOpenApiDocument,
  type BuildOptions,
} from './document/build-document';
export {
  classToJsonSchema,
  registerDtoSchema,
  createSchemaRegistry,
  refFor,
  type SchemaRegistry,
} from './schema/class-to-json-schema';
export {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiExcludeEndpoint,
  getApiTags,
  getApiOperation,
  getApiResponses,
  getApiSecurity,
  isApiExcluded,
  type ApiOperationOptions,
  type ApiResponseOptions,
  type ApiResponseMetadata,
  type ApiSecurityMetadata,
} from './decorators/api-decorators';
export { renderViewerHtml, type ViewerHtmlOptions } from './http/ui-html';
export { ensureOpenApiIntegration } from './http/registrar';
export type {
  OpenApiConfig,
  OpenApiDocument,
  OpenApiOperation,
  OpenApiPathItem,
  OpenApiParameter,
  OpenApiRequestBody,
  OpenApiResponse,
  OpenApiComponents,
  OpenApiServer,
  SecurityScheme,
  JsonSchema,
} from './interfaces';
