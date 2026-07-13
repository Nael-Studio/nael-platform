/** The subset of the HTTP `RequestContext` the microservice routes rely on. */
export interface RequestContextLike {
  request: Request;
  body: unknown;
}

/** Dapr forwards its own metadata as `dapr-*` request headers. */
export const extractMetadata = (headers: Headers): Record<string, string> | undefined => {
  const metadata: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (key.startsWith('dapr-') || key === 'traceparent') {
      metadata[key] = value;
    }
  });
  return Object.keys(metadata).length ? metadata : undefined;
};

/**
 * Dapr wraps published events in a CloudEvent envelope, placing the user payload
 * under `data`. Unwrap it when present, otherwise pass the body through.
 */
export const unwrapEventPayload = (body: unknown): unknown => {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: unknown }).data;
  }
  return body;
};
