import 'reflect-metadata';
import type { ClassType } from '@nl-framework/core';
import { getControllerPrefix } from '@nl-framework/core';
import {
  getRouteDefinitions,
  getRouteArgsMetadata,
  getDeclaredVersions,
  type RouteArgMetadata,
} from '@nl-framework/http';
import type {
  OpenApiConfig,
  OpenApiDocument,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiPathItem,
  OpenApiResponse,
  JsonSchema,
} from '../interfaces';
import {
  createSchemaRegistry,
  refFor,
  registerDtoSchema,
  type SchemaRegistry,
} from '../schema/class-to-json-schema';
import {
  getApiTags,
  getApiOperation,
  getApiResponses,
  getApiSecurity,
  isApiExcluded,
} from '../decorators/api-decorators';

const PRIMITIVES = new Set<unknown>([String, Number, Boolean, Array, Object, Promise, Date]);

const isDtoClass = (value: unknown): value is ClassType =>
  typeof value === 'function' && !PRIMITIVES.has(value);

/** Join a controller prefix with a route path and normalize slashes. */
const joinPath = (prefix: string, path: string): string => {
  let combined = `/${prefix ?? ''}/${path ?? ''}`.replace(/\/+/g, '/');
  if (combined.length > 1 && combined.endsWith('/')) {
    combined = combined.slice(0, -1);
  }
  return combined || '/';
};

/** `:id` → `{id}` for OpenAPI path templating. */
const toOpenApiPath = (path: string): string =>
  path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');

const pathParamNames = (openApiPath: string): string[] => {
  const names: string[] = [];
  const regex = /\{([A-Za-z0-9_]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(openApiPath)) !== null) {
    names.push(match[1]!);
  }
  return names;
};

const schemaForScalarType = (designType: unknown): JsonSchema => {
  switch (designType) {
    case Number:
      return { type: 'number' };
    case Boolean:
      return { type: 'boolean' };
    case Date:
      return { type: 'string', format: 'date-time' };
    case Array:
      return { type: 'array', items: {} };
    default:
      return { type: 'string' };
  }
};

interface OperationBuildResult {
  operation: OpenApiOperation;
  method: string;
}

const buildParameters = (
  openApiPath: string,
  args: RouteArgMetadata[],
  paramTypes: unknown[],
): OpenApiParameter[] => {
  const parameters: OpenApiParameter[] = [];
  const declaredPathParams = new Map<string, JsonSchema>();

  for (const arg of args) {
    const name = typeof arg.data === 'string' ? arg.data : undefined;
    const schema = schemaForScalarType(paramTypes[arg.index]);
    if (arg.type === 'param') {
      if (name) {
        declaredPathParams.set(name, schema);
      }
      continue;
    }
    if (arg.type === 'query' && name) {
      parameters.push({ name, in: 'query', required: false, schema });
    } else if (arg.type === 'headers' && name) {
      parameters.push({ name, in: 'header', required: false, schema });
    }
  }

  // Every `{param}` in the path must be declared, even if the handler reads it
  // off the request context instead of via `@Param()`.
  for (const name of pathParamNames(openApiPath)) {
    parameters.unshift({
      name,
      in: 'path',
      required: true,
      schema: declaredPathParams.get(name) ?? { type: 'string' },
    });
  }

  return parameters;
};

const buildOperation = (
  controllerClass: ClassType,
  handlerName: string,
  openApiPath: string,
  registry: SchemaRegistry,
  config: OpenApiConfig,
  controllerTags: string[],
): OperationBuildResult | null => {
  const prototype = controllerClass.prototype as object;

  if (isApiExcluded(prototype, handlerName)) {
    return null;
  }

  const args = getRouteArgsMetadata(prototype, handlerName);
  const paramTypes = (Reflect.getMetadata('design:paramtypes', prototype, handlerName) as
    | unknown[]
    | undefined) ?? [];
  const returnType = Reflect.getMetadata('design:returntype', prototype, handlerName);

  const parameters = buildParameters(openApiPath, args, paramTypes);

  const operation: OpenApiOperation = {
    operationId: `${controllerClass.name}_${handlerName}`,
    responses: {},
  };

  const tags = Array.from(new Set([...controllerTags, ...getApiTags(prototype, handlerName)]));
  if (tags.length) {
    operation.tags = tags;
  }

  if (parameters.length) {
    operation.parameters = parameters;
  }

  // Request body from the @Body() DTO.
  const bodyArg = args.find((arg) => arg.type === 'body');
  let hasValidatedBody = false;
  if (bodyArg && isDtoClass(paramTypes[bodyArg.index])) {
    const bodyClass = paramTypes[bodyArg.index] as ClassType;
    hasValidatedBody = true;
    operation.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: refFor(registerDtoSchema(bodyClass, registry)),
        },
      },
    };
  }

  // Default success response derived from the return type.
  const successResponse: OpenApiResponse = { description: 'Successful response' };
  if (isDtoClass(returnType)) {
    successResponse.content = {
      'application/json': {
        schema: refFor(registerDtoSchema(returnType as ClassType, registry)),
      },
    };
  }
  operation.responses['200'] = successResponse;

  if (hasValidatedBody) {
    operation.responses['400'] = { description: 'Validation failed' };
  }

  // Enrichment: @ApiResponse entries override/extend derived responses.
  for (const response of getApiResponses(prototype, handlerName)) {
    const entry: OpenApiResponse = {
      description: response.description ?? `Response ${response.status}`,
    };
    if (isDtoClass(response.type)) {
      entry.content = {
        'application/json': {
          schema: refFor(registerDtoSchema(response.type as ClassType, registry)),
        },
      };
    }
    operation.responses[String(response.status)] = entry;
  }

  // Enrichment: @ApiOperation overrides summary/description/deprecated.
  const opMeta = getApiOperation(prototype, handlerName);
  if (opMeta?.summary) {
    operation.summary = opMeta.summary;
  }
  if (opMeta?.description) {
    operation.description = opMeta.description;
  }
  if (opMeta?.deprecated) {
    operation.deprecated = true;
  }

  // Enrichment: @ApiSecurity (controller + method) → per-operation security.
  const security = [
    ...getApiSecurity(controllerClass),
    ...getApiSecurity(prototype, handlerName),
  ];
  if (security.length) {
    operation.security = security.map((entry) => ({ [entry.name]: entry.scopes }));
  }

  return { operation, method: '' };
};

export interface BuildOptions extends OpenApiConfig {
  /** URI version prefix used when a route declares `@Version()`. Default `'v'`. */
  versionPrefix?: string;
}

/**
 * Build an OpenAPI 3.1 document from the given controller classes. Reads only
 * decorator/reflection metadata the framework already captures, so it can run
 * at boot without instantiating anything.
 */
export const buildOpenApiDocument = (
  controllers: ClassType[],
  config: BuildOptions,
): OpenApiDocument => {
  const registry = createSchemaRegistry();
  const versionPrefix = config.versionPrefix ?? 'v';
  const paths: Record<string, OpenApiPathItem> = {};

  // Deterministic ordering for stable snapshots.
  const sortedControllers = [...controllers].sort((a, b) => a.name.localeCompare(b.name));

  for (const controllerClass of sortedControllers) {
    const prefix = getControllerPrefix(controllerClass) ?? '';
    const controllerTags = getApiTags(controllerClass);
    const controllerVersions = getDeclaredVersions(controllerClass);
    const routes = getRouteDefinitions(controllerClass);

    for (const route of routes) {
      const basePath = toOpenApiPath(joinPath(prefix, route.path ?? ''));
      const built = buildOperation(
        controllerClass,
        route.handlerName,
        basePath,
        registry,
        config,
        controllerTags,
      );
      if (!built) {
        continue;
      }

      const versions =
        getDeclaredVersions(controllerClass.prototype, route.handlerName) ?? controllerVersions;
      const targetPaths =
        versions && versions.length
          ? versions.map((version) => joinPath(`${versionPrefix}${version}`, basePath.slice(1)))
          : [basePath];

      const method = route.method.toLowerCase() as keyof OpenApiPathItem;

      for (const targetPath of targetPaths) {
        const normalized = toOpenApiPath(targetPath);
        const item = (paths[normalized] ??= {});
        item[method] = built.operation;
      }
    }
  }

  const document: OpenApiDocument = {
    openapi: '3.1.0',
    info: {
      title: config.title,
      version: config.version,
      ...(config.description ? { description: config.description } : {}),
    },
    paths,
    components: {
      schemas: registry.schemas,
      ...(config.securitySchemes ? { securitySchemes: config.securitySchemes } : {}),
    },
  };

  if (config.servers?.length) {
    document.servers = config.servers;
  }
  if (config.tags?.length) {
    document.tags = config.tags;
  }
  if (config.security?.length) {
    document.security = config.security;
  }

  return document;
};
