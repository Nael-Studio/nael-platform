import { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/shared/simple-code-block";

const basicController = `import { Controller, Get } from '@nl-framework/http';

@Controller('users')
export class UsersController {
  @Get()
  findAll(): string {
    return 'This action returns all users';
  }
}`;

const postMethod = `import { Controller, Get, Post } from '@nl-framework/http';

@Controller('users')
export class UsersController {
  @Post()
  create(): string {
    return 'This action adds a new user';
  }

  @Get()
  findAll(): string {
    return 'This action returns all users';
  }
}`;

const allMethods = `import { Controller, Get, Post, Put, Delete, Patch } from '@nl-framework/http';

@Controller('users')
export class UsersController {
  @Post()
  create() {}

  @Get()
  findAll() {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return \`This action returns user #\${id}\`;
  }

  @Put(':id')
  update(@Param('id') id: string) {}

  @Delete(':id')
  remove(@Param('id') id: string) {}
}`;

const routeParams = `@Get(':id')
findOne(@Param('id') id: string): string {
  return \`This action returns user #\${id}\`;
}`;

const requestBody = `import { Body, Post } from '@nl-framework/http';

class CreateUserDto {
  name: string;
  email: string;
  age: number;
}

@Post()
create(@Body() createUserDto: CreateUserDto) {
  return 'This action adds a new user';
}`;

const fullRequest = `import { Req } from '@nl-framework/http';
import { Request } from '@nl-framework/platform';

@Get()
findAll(@Req() request: Request) {
  return request.headers;
}`;

const asyncController = `@Get()
async findAll(): Promise<User[]> {
  return await this.usersService.findAll();
}`;

const statusCode = `import { Post, HttpCode } from '@nl-framework/http';

@Post()
@HttpCode(204)
create() {
  return 'This action adds a new user';
}`;

const customHeaders = `import { Post, Header } from '@nl-framework/http';

@Post()
@Header('Cache-Control', 'no-store')
create() {
  return 'This action adds a new user';
}`;

const redirect = `import { Get, Redirect } from '@nl-framework/http';

@Get()
@Redirect('https://nael.dev', 301)
redirect() {}`;

const dynamicRedirect = `@Get('docs')
@Redirect('https://docs.nael.dev', 302)
getDocs(@Query('version') version) {
  if (version && version === '5') {
    return { url: 'https://docs.nael.dev/v5' };
  }
}`;

const subDomainRouting = `@Controller({ host: ':account.example.com' })
export class AccountController {
  @Get()
  getInfo(@HostParam('account') account: string) {
    return account;
  }
}`;

export const metadata: Metadata = {
  title: "Controllers · Nael Platform",
  description: "Learn how to create and use controllers to handle incoming requests in Nael Platform.",
};

export default function ControllersPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Overview</p>
        <h1 className="text-4xl font-semibold">Controllers</h1>
        <p className="max-w-2xl text-muted-foreground">
          Controllers are responsible for handling incoming requests and returning responses to the client. A controller&apos;s purpose is to receive
          specific requests for the application. The routing mechanism controls which controller receives which requests.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Routing</h2>
        <p className="text-muted-foreground">
          In the following example we&apos;ll use the <code>@Controller()</code> decorator, which is required to define a basic controller.
          We&apos;ll specify an optional route path prefix of <code>users</code>. Using a path prefix in a <code>@Controller()</code> decorator
          allows us to easily group a set of related routes and minimize repetitive code.
        </p>
        <CodeBlock code={basicController} title="users.controller.ts" />
        <p className="text-sm text-muted-foreground">
          The <code>@Get()</code> HTTP request method decorator before the <code>findAll()</code> method tells Nael to create a handler for
          a specific endpoint for HTTP requests. The endpoint corresponds to the HTTP request method (GET in this case) and the route path.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Request object</h2>
        <p className="text-muted-foreground">
          Handlers often need access to the client request details. Nael provides access to the request object. We can access the request object
          by instructing Nael to inject it by adding the <code>@Req()</code> decorator to the handler&apos;s signature.
        </p>
        <CodeBlock code={fullRequest} title="Using request object" />
        <p className="text-sm text-muted-foreground">
          The request object represents the HTTP request and has properties for the request query string, parameters, HTTP headers, and body.
          In most cases, it&apos;s not necessary to grab these properties manually. We can use dedicated decorators instead, such as <code>@Body()</code> or <code>@Query()</code>.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Resources</h2>
        <p className="text-muted-foreground">
          Earlier, we defined an endpoint to fetch users (GET route). We&apos;ll typically also want to provide an endpoint that creates new records.
          For this, let&apos;s create the POST handler:
        </p>
        <CodeBlock code={postMethod} title="POST handler" />
        <p className="text-sm text-muted-foreground">
          Nael provides decorators for all of the standard HTTP methods: <code>@Get()</code>, <code>@Post()</code>, <code>@Put()</code>, <code>@Delete()</code>, <code>@Patch()</code>, <code>@Options()</code>, and <code>@Head()</code>.
          In addition, <code>@All()</code> defines an endpoint that handles all of them.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Route wildcards</h2>
        <p className="text-muted-foreground">
          Pattern-based routes are supported as well. For instance, the asterisk is used as a wildcard, and will match any combination of characters:
        </p>
        <CodeBlock code={`@Get('ab*cd')\nfindAll() {\n  return 'This route uses a wildcard';\n}`} title="Wildcard route" />
        <p className="text-sm text-muted-foreground">
          The <code>&apos;ab*cd&apos;</code> route path will match <code>abcd</code>, <code>ab_cd</code>, <code>abecd</code>, and so on.
          The characters <code>?</code>, <code>+</code>, <code>*</code>, and <code>()</code> may be used in a route path, and are subsets of their regular expression counterparts.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Status code</h2>
        <p className="text-muted-foreground">
          As mentioned, the response status code is always 200 by default, except for POST requests which use 201. We can easily change this behavior
          by adding the <code>@HttpCode(...)</code> decorator at a handler level.
        </p>
        <CodeBlock code={statusCode} title="Custom status code" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Headers</h2>
        <p className="text-muted-foreground">
          To specify a custom response header, you can either use a <code>@Header()</code> decorator or a library-specific response object.
        </p>
        <CodeBlock code={customHeaders} title="Custom headers" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Redirection</h2>
        <p className="text-muted-foreground">
          To redirect a response to a specific URL, you can either use a <code>@Redirect()</code> decorator or a library-specific response object.
        </p>
        <CodeBlock code={redirect} title="Static redirect" />
        <p className="text-sm text-muted-foreground">
          <code>@Redirect()</code> takes two arguments, <code>url</code> and <code>statusCode</code>, both are optional. The default value of <code>statusCode</code> is <code>302</code> (Found) if omitted.
        </p>
        <CodeBlock code={dynamicRedirect} title="Dynamic redirect" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Route parameters</h2>
        <p className="text-muted-foreground">
          Routes with static paths won&apos;t work when you need to accept dynamic data as part of the request (e.g., <code>GET /users/1</code> to get user with id <code>1</code>).
          In order to define routes with parameters, we can add route parameter tokens in the path of the route to capture the dynamic value at that position in the request URL.
        </p>
        <CodeBlock code={routeParams} title="Route parameters" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Sub-Domain Routing</h2>
        <p className="text-muted-foreground">
          The <code>@Controller</code> decorator can take a <code>host</code> option to require that the HTTP host of the incoming requests matches some specific value.
        </p>
        <CodeBlock code={subDomainRouting} title="Sub-domain routing" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Asynchronicity</h2>
        <p className="text-muted-foreground">
          Nael supports async functions. Every async function has to return a <code>Promise</code>. This means that you can return a deferred value
          that Nael will be able to resolve by itself.
        </p>
        <CodeBlock code={asyncController} title="Async controller" />
        <p className="text-sm text-muted-foreground">
          Furthermore, Nael route handlers are even more powerful by being able to return Bun streams. Nael will automatically resolve the stream.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Request payloads</h2>
        <p className="text-muted-foreground">
          Our previous example of the POST route handler didn&apos;t accept any client params. Let&apos;s fix this by adding the <code>@Body()</code> decorator here.
        </p>
        <CodeBlock code={requestBody} title="Request body" />
        <p className="text-sm text-muted-foreground">
          We use TypeScript classes to define our DTO (Data Transfer Object) schema. We recommend using classes because they preserve type information at runtime,
          which is useful for validation with pipes.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Full resource example</h2>
        <CodeBlock code={allMethods} title="Full CRUD controller" />
        <p className="text-sm text-muted-foreground">
          With the above controller fully defined, Nael knows exactly how to map every route. Note that Nael employs dependency injection,
          so we can inject the <code>UsersService</code> into the controller&apos;s constructor.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">What&apos;s next?</h2>
        <p className="text-muted-foreground">
          Learn about <Link className="text-primary" href="/docs/providers">Providers</Link> to handle business logic, or explore <Link className="text-primary" href="/docs/modules">Modules</Link> to organize your application structure.
        </p>
      </section>
    </div>
  );
}
