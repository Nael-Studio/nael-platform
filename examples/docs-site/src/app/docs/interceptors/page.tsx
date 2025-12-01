import { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CodeBlock } from "@/components/shared/simple-code-block";

const interceptorInterface = `import { Injectable } from '@nl-framework/core';
import { CallHandler, HttpInterceptor, HttpExecutionContext } from '@nl-framework/http';

@Injectable()
export class LoggingInterceptor implements HttpInterceptor {
  async intercept(context: HttpExecutionContext, next: CallHandler) {
    const start = Date.now();
    console.log('Before handler', context.getRoute().handlerName);

    const result = await next.handle();

    console.log('After handler', Date.now() - start, 'ms');
    return result;
  }
}`;

const controllerUsage = `import { Controller, Get, UseInterceptors } from '@nl-framework/http';
import { LoggingInterceptor } from './logging.interceptor';

@UseInterceptors(LoggingInterceptor)
@Controller('/reports')
export class ReportsController {
  @Get()
  async list() {
    return { reports: [] };
  }

  @UseInterceptors(RequestTimingInterceptor)
  @Get('/daily')
  daily() {
    return { status: 'ok' };
  }
}`;

const functionalInterceptor = `import { InterceptorFunction } from '@nl-framework/http';

export const CacheInterceptor: InterceptorFunction = async (context, next) => {
  const cacheKey = context.getRoute().controller?.name + ':' + context.getRequest().url;
  const cached = await context.getContainer().resolve(CacheStore).get(cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { 'content-type': 'application/json' },
    });
  }

  const result = await next.handle();
  await context.getContainer().resolve(CacheStore).set(cacheKey, result);
  return result;
};

@Controller('/inventory')
export class InventoryController {
  @Get()
  @UseInterceptors(CacheInterceptor)
  list() {
    return this.service.all();
  }
}`;

const globalInterceptor = `import { registerHttpInterceptor } from '@nl-framework/http';
import { LoggingInterceptor } from './logging.interceptor';

registerHttpInterceptor(LoggingInterceptor);

const app = await createHttpApplication(AppModule, { port: 3000 });
await app.listen();`;

const graphqlResolverInterceptors = `import { ObjectType, Field } from '@nl-framework/graphql';
import { Resolver, Query } from '@nl-framework/graphql';
import { UseInterceptors } from '@nl-framework/http';
import {
  GraphqlCallHandler,
  GraphqlInterceptor,
  registerGraphqlInterceptor,
} from '@nl-framework/graphql';

class EnvelopeInterceptor implements GraphqlInterceptor {
  async intercept(_context: unknown, next: GraphqlCallHandler) {
    const result = await next.handle();
    return { data: result };
  }
}

registerGraphqlInterceptor(EnvelopeInterceptor);

@ObjectType()
class Report {
  @Field()
  message!: string;
}

@Resolver(() => Report)
@UseInterceptors(EnvelopeInterceptor)
export class ReportResolver {
  @Query(() => Report)
  stats() {
    return { message: 'report' };
  }
}`;

const responseMapping = `import { CallHandler, HttpExecutionContext, HttpInterceptor } from '@nl-framework/http';

export class EnvelopeInterceptor implements HttpInterceptor {
  async intercept(_context: HttpExecutionContext, next: CallHandler) {
    const result = await next.handle();
    return { data: result, at: new Date().toISOString() };
  }
}

@Controller('/users')
@UseInterceptors(EnvelopeInterceptor)
export class UsersController {
  @Get()
  list() {
    return [{ id: 1, email: 'ada@example.com' }];
  }
}`;

const exceptionMapping = `import { HttpInterceptor, CallHandler, HttpExecutionContext } from '@nl-framework/http';
import { ApplicationException } from '@nl-framework/core';

export class ErrorsInterceptor implements HttpInterceptor {
  async intercept(_context: HttpExecutionContext, next: CallHandler) {
    try {
      return await next.handle();
    } catch (error) {
      if (error instanceof ApplicationException) {
        return new Response(
          JSON.stringify({ code: error.code, message: error.message }),
          { status: 502, headers: { 'content-type': 'application/json' } },
        );
      }
      throw error;
    }
  }
}`;

const timeoutInterceptor = `import { HttpInterceptor, HttpExecutionContext, CallHandler } from '@nl-framework/http';

export class TimeoutInterceptor implements HttpInterceptor {
  constructor(private readonly timeoutMs = 5000) {}

  async intercept(_context: HttpExecutionContext, next: CallHandler) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await Promise.race([
        next.handle(),
        new Promise((_, reject) => controller.signal.addEventListener('abort', () => reject(new Error('Request timeout')))),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }
}`;

export const metadata: Metadata = {
  title: "Interceptors - NL Framework",
  description: "Learn how to extend request/response behavior with interceptors in NL Framework.",
};

export default function InterceptorsPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-50">Runtime</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Interceptors</h1>
        <p className="text-lg text-muted-foreground">
          Interceptors wrap the execution of your route handlers, giving you a single place to run code before and after
          controllers execute. Use them for logging, response mapping, caching, exception translation, or any
          cross-cutting behavior.
        </p>
      </div>

      <Card className="border-purple-200 bg-purple-50 dark:border-purple-900/50 dark:bg-purple-950">
        <CardContent className="pt-6 text-sm text-purple-900 dark:text-purple-50">
          <p>
            <strong>Key pipeline order:</strong> middleware ➜ guards ➜ <strong>interceptors</strong> ➜ pipes ➜ handler ➜ filters.
            Interceptors share the same <code>HttpExecutionContext</code> as guards and can short-circuit requests by returning
            their own <code>Response</code> objects.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-4" id="basics">
        <h2 className="text-2xl font-semibold">Implementing an interceptor</h2>
        <p className="text-muted-foreground">
          Interceptors implement the <code>HttpInterceptor</code> interface. They receive the execution context and a
          <code>CallHandler</code> that invokes the next interceptor (or ultimately the route handler).
        </p>
        <CodeBlock code={interceptorInterface} title="Logging interceptor" />
      </section>

      <section className="space-y-4" id="binding">
        <h2 className="text-2xl font-semibold">Binding interceptors</h2>
        <p className="text-muted-foreground">
          Use the <code>@UseInterceptors()</code> decorator to attach interceptors to controllers or individual handlers.
          Order matters—the first decorator argument wraps everything that follows.
        </p>
        <CodeBlock code={controllerUsage} title="Controller and method scopes" />
      </section>

      <section className="space-y-4" id="functional">
        <h2 className="text-2xl font-semibold">Functional interceptors</h2>
        <p className="text-muted-foreground">
          For lightweight cases you can pass an <code>InterceptorFunction</code>. Functional interceptors are great for caching
          or analytics because they require no class registration.
        </p>
        <CodeBlock code={functionalInterceptor} title="Cache interceptor" />
      </section>

      <section className="space-y-4" id="global">
        <h2 className="text-2xl font-semibold">Global interceptors</h2>
        <p className="text-muted-foreground">
          Call <code>registerHttpInterceptor()</code> during bootstrap to run an interceptor for every request. Global
          interceptors execute outside controller scopes, so prefer functional interceptors or stateless classes.
        </p>
        <CodeBlock code={globalInterceptor} title="Register a global interceptor" />
      </section>

      <section className="space-y-4" id="graphql">
        <h2 className="text-2xl font-semibold">GraphQL resolvers</h2>
        <p className="text-muted-foreground">
          The same <code>@UseInterceptors()</code> decorator now wraps GraphQL resolvers. Combine controller-scoped and global
          <code>registerGraphqlInterceptor()</code> hooks to envelope responses, cache resolver results, or run observability spans
          without duplicating logic in HTTP land.
        </p>
        <CodeBlock code={graphqlResolverInterceptors} title="Resolver interceptors" />
      </section>

      <section className="space-y-4" id="response-mapping">
        <h2 className="text-2xl font-semibold">Transforming responses</h2>
        <p className="text-muted-foreground">
          Wrap handler results before they leave the server. This is helpful for enforcing envelope shapes, stripping null
          values, or appending metadata.
        </p>
        <CodeBlock code={responseMapping} title="Response envelopes" />
      </section>

      <section className="space-y-4" id="errors">
        <h2 className="text-2xl font-semibold">Translating exceptions</h2>
        <p className="text-muted-foreground">
          Because interceptors surround the handler, they can catch exceptions and transform them into framework-friendly
          responses. This is a good place to unify error payloads across HTTP and GraphQL transports.
        </p>
        <CodeBlock code={exceptionMapping} title="Normalize framework errors" />
      </section>

      <section className="space-y-4" id="timeouts">
        <h2 className="text-2xl font-semibold">Short-circuiting or timing out</h2>
        <p className="text-muted-foreground">
          Interceptors can completely bypass the handler. Return a cached <code>Response</code>, or race the handler against a
          timeout promise and throw when it takes too long.
        </p>
        <CodeBlock code={timeoutInterceptor} title="Timeout interceptor" />
      </section>

      <section className="space-y-3" id="best-practices">
        <h2 className="text-2xl font-semibold">Best practices</h2>
        <Card className="border-border/70">
          <CardContent className="space-y-2 pt-6 text-sm text-muted-foreground">
            <p><strong>Be explicit about order.</strong> Declare interceptors from most global to most specific to avoid surprises.</p>
            <p><strong>Keep them stateless when global.</strong> If an interceptor needs dependencies, register it via DI so the container can manage scope.</p>
            <p><strong>Return consistent shapes.</strong> When transforming responses, wrap data predictably so clients know what to expect.</p>
            <p><strong>Short-circuit intentionally.</strong> Always document when an interceptor might skip the underlying handler (caching, feature flags, etc.).</p>
          </CardContent>
        </Card>
      </section>
    </article>
  );
}
