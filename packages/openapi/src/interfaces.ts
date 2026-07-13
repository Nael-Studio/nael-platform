/**
 * Minimal, hand-built OpenAPI 3.1 typings — only the subset the generator emits.
 * Kept structural (index signatures on the leaf objects) so enrichment metadata
 * can graft arbitrary vendor fields without fighting the types.
 */

export type JsonSchema = {
  type?: string | string[];
  format?: string;
  description?: string;
  enum?: unknown[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  nullable?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  default?: unknown;
  $ref?: string;
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  [key: string]: unknown;
};

export interface OpenApiParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  description?: string;
  schema?: JsonSchema;
}

export interface OpenApiMediaType {
  schema?: JsonSchema;
}

export interface OpenApiRequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, OpenApiMediaType>;
}

export interface OpenApiResponse {
  description: string;
  content?: Record<string, OpenApiMediaType>;
}

export interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: Record<string, OpenApiResponse>;
  security?: Array<Record<string, string[]>>;
  [key: string]: unknown;
}

export type OpenApiPathItem = Partial<Record<
  'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace',
  OpenApiOperation
>>;

export interface OpenApiServer {
  url: string;
  description?: string;
}

export type SecurityScheme = {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect' | 'mutualTLS';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  [key: string]: unknown;
};

export interface OpenApiComponents {
  schemas?: Record<string, JsonSchema>;
  securitySchemes?: Record<string, SecurityScheme>;
}

export interface OpenApiDocument {
  openapi: '3.1.0';
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: OpenApiServer[];
  paths: Record<string, OpenApiPathItem>;
  components: OpenApiComponents;
  tags?: Array<{ name: string; description?: string }>;
  security?: Array<Record<string, string[]>>;
}

/** User-supplied document configuration. */
export interface OpenApiConfig {
  title: string;
  version: string;
  description?: string;
  servers?: OpenApiServer[];
  securitySchemes?: Record<string, SecurityScheme>;
  /** Applied to every operation unless overridden per-route. */
  security?: Array<Record<string, string[]>>;
  tags?: Array<{ name: string; description?: string }>;
}
