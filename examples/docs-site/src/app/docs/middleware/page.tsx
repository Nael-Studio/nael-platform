import { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/shared/simple-code-block";

const basicMiddleware = `import { MiddlewareHandler } from '@nl-framework/http';

const loggingMiddleware: MiddlewareHandler = async (ctx, next) => {
  console.log(\`[\${ctx.request.method}] \${new URL(ctx.request.url).pathname}\`);
  const response = await next();
  console.log(\`Response status: \${response.status}\`);
  return response;
};`;

const timingMiddleware = `import { MiddlewareHandler } from '@nl-framework/http';

const requestTimingMiddleware: MiddlewareHandler = async (ctx, next) => {
  const started = Date.now();
  
  try {
    const response = await next();
    const elapsed = Date.now() - started;
    
    console.log('Request completed', {
      method: ctx.request.method,
      path: new URL(ctx.request.url).pathname,
      status: response.status,
      elapsedMs: elapsed,
    });
    
    return response;
  } catch (error) {
    const elapsed = Date.now() - started;
    console.error('Request failed', {
      method: ctx.request.method,
      path: new URL(ctx.request.url).pathname,
      elapsedMs: elapsed,
      error,
    });
    throw error;
  }
};`;

const applyMiddleware = `import { NaelFactory } from '@nl-framework/platform';
import { AppModule } from './app.module';

const app = await NaelFactory.create(AppModule);
const httpApp = app.getHttpApplication();

if (httpApp) {
  httpApp.use(loggingMiddleware);
  httpApp.use(requestTimingMiddleware);
}

await app.listen({ http: 3000 });`;

const createMiddleware = `import { createHttpApplication } from '@nl-framework/http';
import { AppModule } from './app.module';

const app = await createHttpApplication(AppModule, {
  port: 3000,
  middleware: [
    loggingMiddleware,
    requestTimingMiddleware,
  ],
});

await app.listen();`;

const corsMiddleware = `import { MiddlewareHandler } from '@nl-framework/http';

const corsMiddleware: MiddlewareHandler = async (ctx, next) => {
  // Handle preflight requests
  if (ctx.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const response = await next();
  
  // Add CORS headers to the response
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};`;

const authMiddleware = `import { MiddlewareHandler } from '@nl-framework/http';

const authMiddleware: MiddlewareHandler = async (ctx, next) => {
  const authHeader = ctx.request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const token = authHeader.substring(7);
  
  try {
    // Validate token here
    const user = await validateToken(token);
    
    // Attach user to context (would need custom context extension)
    // For now, continue to next middleware
    return await next();
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid token' }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};`;

const requestIdMiddleware = `import { MiddlewareHandler } from '@nl-framework/http';

const requestIdMiddleware: MiddlewareHandler = async (ctx, next) => {
  const requestId = crypto.randomUUID();
  
  const response = await next();
  
  const headers = new Headers(response.headers);
  headers.set('X-Request-ID', requestId);
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};`;

const compressionMiddleware = `import { MiddlewareHandler } from '@nl-framework/http';

const compressionMiddleware: MiddlewareHandler = async (ctx, next) => {
  const response = await next();
  
  const acceptEncoding = ctx.request.headers.get('Accept-Encoding') || '';
  
  if (!acceptEncoding.includes('gzip')) {
    return response;
  }
  
  // Only compress JSON responses
  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    return response;
  }
  
  const body = await response.text();
  const compressed = await Bun.gzipSync(Buffer.from(body));
  
  const headers = new Headers(response.headers);
  headers.set('Content-Encoding', 'gzip');
  headers.set('Content-Length', compressed.length.toString());
  
  return new Response(compressed, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};`;

const errorHandlingMiddleware = `import { MiddlewareHandler } from '@nl-framework/http';

const errorHandlingMiddleware: MiddlewareHandler = async (ctx, next) => {
  try {
    return await next();
  } catch (error) {
    console.error('Unhandled error:', error);
    
    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: error.details,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    if (error instanceof NotFoundError) {
      return new Response(
        JSON.stringify({ error: 'Resource not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};`;

const conditionalMiddleware = `import { MiddlewareHandler } from '@nl-framework/http';

const apiOnlyMiddleware: MiddlewareHandler = async (ctx, next) => {
  const url = new URL(ctx.request.url);
  
  // Only apply this middleware to /api routes
  if (!url.pathname.startsWith('/api')) {
    return await next();
  }
  
  // Add API-specific headers
  const response = await next();
  const headers = new Headers(response.headers);
  headers.set('X-API-Version', '1.0');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};`;

const multipleMiddleware = `import { NaelFactory } from '@nl-framework/platform';
import { Logger, LoggerFactory } from '@nl-framework/logger';
import type { MiddlewareHandler } from '@nl-framework/http';
import { AppModule } from './app.module';

const bootstrap = async () => {
  const app = await NaelFactory.create(AppModule);
  const loggerFactory = await app.get<LoggerFactory>(LoggerFactory);
  const requestLogger = loggerFactory.create({ context: 'Request' });

  const httpApp = app.getHttpApplication();
  if (!httpApp) {
    throw new Error('HTTP application not available');
  }

  // Error handling (first)
  httpApp.use(errorHandlingMiddleware);
  
  // Request logging
  const loggingMiddleware: MiddlewareHandler = async (ctx, next) => {
    const started = Date.now();
    try {
      const response = await next();
      requestLogger.debug('Request completed', {
        method: ctx.request.method,
        path: new URL(ctx.request.url).pathname,
        status: response.status,
        elapsedMs: Date.now() - started,
      });
      return response;
    } catch (error) {
      requestLogger.error('Request failed', error);
      throw error;
    }
  };
  httpApp.use(loggingMiddleware);
  
  // CORS
  httpApp.use(corsMiddleware);
  
  // Request ID
  httpApp.use(requestIdMiddleware);
  
  await app.listen({ http: 3000 });
};

bootstrap().catch(console.error);`;

const contextAccess = `import { MiddlewareHandler } from '@nl-framework/http';

const contextAwareMiddleware: MiddlewareHandler = async (ctx, next) => {
  // Access request details
  console.log('Method:', ctx.request.method);
  console.log('URL:', ctx.request.url);
  console.log('Headers:', Object.fromEntries(ctx.headers.entries()));
  console.log('Query params:', Object.fromEntries(ctx.query.entries()));
  console.log('Route params:', ctx.params);
  
  // Access route information
  console.log('Controller:', ctx.route.controller.name);
  console.log('Handler:', ctx.route.handlerName);
  console.log('Route path:', ctx.route.definition.path);
  
  // Access DI container
  const someService = await ctx.container.resolve(SomeService);
  
  return await next();
};`;

export const metadata: Metadata = {
  title: "Middleware · Nael Platform",
  description: "Learn how to use middleware for request processing, logging, authentication, and error handling in Nael applications.",
};

export default function MiddlewarePage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Overview</p>
        <h1 className="text-4xl font-semibold">Middleware</h1>
        <p className="max-w-2xl text-muted-foreground">
          Middleware is a function which is called before the route handler. Middleware functions have access to the{" "}
          <Link className="text-primary" href="#request-context">request context</Link> and can perform tasks like logging,
          authentication, request transformation, and error handling. They execute in the order they are registered.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Middleware function</h2>
        <p className="text-muted-foreground">
          Middleware functions in Nael are defined using the <code>MiddlewareHandler</code> type. Each middleware receives
          the request context and a <code>next()</code> function to call the next middleware in the chain or the final route handler.
        </p>
        <CodeBlock code={basicMiddleware} title="Basic middleware" />
        <p className="text-sm text-muted-foreground">
          The middleware must call <code>await next()</code> to pass control to the next middleware or route handler, and it must
          return a <code>Response</code> object. You can modify the request context before calling <code>next()</code>, or modify
          the response after calling <code>next()</code>.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Applying middleware</h2>
        <p className="text-muted-foreground">
          You can apply middleware to your HTTP application in two ways: by passing them during application creation,
          or by calling <code>use()</code> on the HTTP application instance.
        </p>
        <CodeBlock code={applyMiddleware} title="Using .use() method" />
        <p className="text-sm text-muted-foreground">
          Alternatively, you can pass middleware during application creation:
        </p>
        <CodeBlock code={createMiddleware} title="Passing middleware to createHttpApplication" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Request timing</h2>
        <p className="text-muted-foreground">
          A common use case for middleware is to measure request duration. Here&apos;s an example that logs the time taken
          to process each request:
        </p>
        <CodeBlock code={timingMiddleware} title="Request timing middleware" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">CORS middleware</h2>
        <p className="text-muted-foreground">
          Enable Cross-Origin Resource Sharing (CORS) by adding appropriate headers to responses:
        </p>
        <CodeBlock code={corsMiddleware} title="CORS middleware" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Authentication middleware</h2>
        <p className="text-muted-foreground">
          Middleware can be used to validate authentication tokens and protect routes:
        </p>
        <CodeBlock code={authMiddleware} title="Authentication middleware" />
        <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-4">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            <strong>Note:</strong> For more sophisticated authentication scenarios, consider using{" "}
            <Link className="text-primary" href="/docs/guards">Guards</Link> which provide better integration with the
            dependency injection system and can be applied at the controller or handler level.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Error handling</h2>
        <p className="text-muted-foreground">
          Middleware can catch and handle errors from downstream middleware and route handlers:
        </p>
        <CodeBlock code={errorHandlingMiddleware} title="Error handling middleware" />
        <p className="text-sm text-muted-foreground">
          Error handling middleware should typically be registered first so it can catch errors from all other middleware
          and route handlers.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Request ID tracking</h2>
        <p className="text-muted-foreground">
          Add a unique identifier to each request for tracking and debugging:
        </p>
        <CodeBlock code={requestIdMiddleware} title="Request ID middleware" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Response compression</h2>
        <p className="text-muted-foreground">
          Compress response bodies to reduce bandwidth usage:
        </p>
        <CodeBlock code={compressionMiddleware} title="Compression middleware" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Conditional middleware</h2>
        <p className="text-muted-foreground">
          You can apply middleware logic conditionally based on the request path or other criteria:
        </p>
        <CodeBlock code={conditionalMiddleware} title="Conditional middleware" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold" id="request-context">Request context</h2>
        <p className="text-muted-foreground">
          Middleware functions receive a <code>RequestContext</code> object that provides access to request details,
          route information, and the dependency injection container:
        </p>
        <CodeBlock code={contextAccess} title="Accessing request context" />
        <p className="text-sm text-muted-foreground">
          The context object includes:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li><code>request</code> - The original Request object</li>
          <li><code>params</code> - Route parameters extracted from the URL path</li>
          <li><code>query</code> - URLSearchParams object for query string parameters</li>
          <li><code>headers</code> - Headers object for accessing request headers</li>
          <li><code>body</code> - Parsed request body (available after body parsing)</li>
          <li><code>route</code> - Information about the matched route (controller, handler, definition)</li>
          <li><code>container</code> - Access to the DI container for resolving services</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Middleware order</h2>
        <p className="text-muted-foreground">
          The order in which middleware is registered matters. Middleware executes in the order it&apos;s registered, and the
          response flows back in reverse order. Here&apos;s a typical middleware stack:
        </p>
        <CodeBlock code={multipleMiddleware} title="Complete middleware setup" />
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            <strong>Best Practice:</strong> Register error handling middleware first so it can catch errors from all
            other middleware and route handlers. Register authentication and authorization middleware early in the chain,
            and register response modification middleware (like compression) later.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">What&apos;s next?</h2>
        <p className="text-muted-foreground">
          Learn about <Link className="text-primary" href="/docs/exception-filters">Exception Filters</Link> for centralized error handling,
          or explore <Link className="text-primary" href="/docs/guards">Guards</Link> for fine-grained access control.
        </p>
      </section>
    </div>
  );
}
