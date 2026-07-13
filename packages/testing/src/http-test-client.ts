import type { HttpApplication } from '@nl-framework/http';

const TEST_ORIGIN = 'http://testing.local';

export interface JsonRequestInit extends RequestInit {
  /**
   * Convenience: a value serialized to a JSON body. When set, `content-type`
   * defaults to `application/json` and takes precedence over `body`.
   */
  json?: unknown;
}

export interface JsonResponse<T = unknown> {
  status: number;
  headers: Headers;
  body: T;
  /** The raw `Response`, for assertions that need more than the parsed body. */
  response: Response;
}

/**
 * Drives an {@link HttpApplication} entirely in-process — every call goes through
 * the real routing pipeline (middleware, guards, interceptors, pipes, filters)
 * via `HttpApplication.handle`, and no port is ever bound.
 */
export class HttpTestClient {
  constructor(private readonly app: HttpApplication) {}

  /** The underlying application, for advanced assertions or manual dispatch. */
  getApplication(): HttpApplication {
    return this.app;
  }

  /** Dispatch a request and return the raw `Response`. */
  request(path: string, init: RequestInit = {}): Promise<Response> {
    const url = /^https?:\/\//i.test(path)
      ? path
      : `${TEST_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
    return this.app.handle(new Request(url, init));
  }

  /** Dispatch a request and parse the response body as JSON. */
  async requestJson<T = unknown>(path: string, init: JsonRequestInit = {}): Promise<JsonResponse<T>> {
    const { json, ...rest } = init;
    const headers = new Headers(rest.headers);
    let body = rest.body;

    if (json !== undefined) {
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
      body = JSON.stringify(json);
    }

    const response = await this.request(path, { ...rest, headers, body });
    const text = await response.text();
    const parsed = text ? (JSON.parse(text) as T) : (undefined as T);

    return { status: response.status, headers: response.headers, body: parsed, response };
  }

  /**
   * Detaches this client from the shared context. The owning `TestingModule` is
   * responsible for shutting the context (and its lifecycle hooks) down.
   */
  async close(): Promise<void> {
    await this.app.close();
  }
}
