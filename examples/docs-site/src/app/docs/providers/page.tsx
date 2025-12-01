import { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/shared/simple-code-block";

const basicService = `import { Injectable } from '@nl-framework/core';
import { User } from './interfaces/user.interface';

@Injectable()
export class UsersService {
  private readonly users: User[] = [];

  create(user: User) {
    this.users.push(user);
  }

  findAll(): User[] {
    return this.users;
  }

  findOne(id: number): User {
    return this.users.find(user => user.id === id);
  }
}`;

const injectService = `import { Controller, Get, Post, Body, Param } from '@nl-framework/http';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    this.usersService.create(createUserDto);
  }

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }
}`;

const scopedProvider = `import { Injectable, Scope } from '@nl-framework/core';

@Injectable({ scope: Scope.REQUEST })
export class UsersService {}`;

const optionalDeps = `import { Injectable, Optional, Inject } from '@nl-framework/core';

@Injectable()
export class HttpService {
  constructor(@Optional() @Inject('HTTP_OPTIONS') private httpOptions) {}
}`;

const propertyInjection = `import { Injectable, Inject } from '@nl-framework/core';

@Injectable()
export class HttpService {
  @Inject('HTTP_OPTIONS')
  private readonly httpOptions;
}`;

const providerRegistration = `import { Module } from '@nl-framework/core';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}`;

const customProvider = `const connectionProvider = {
  provide: 'CONNECTION',
  useValue: connection,
};

@Module({
  providers: [connectionProvider],
})
export class AppModule {}`;

const useClass = `const configServiceProvider = {
  provide: ConfigService,
  useClass: process.env.NODE_ENV === 'development'
    ? DevelopmentConfigService
    : ProductionConfigService,
};

@Module({
  providers: [configServiceProvider],
})
export class AppModule {}`;

const useFactory = `const connectionFactory = {
  provide: 'CONNECTION',
  useFactory: (optionsProvider: OptionsProvider) => {
    const options = optionsProvider.get();
    return new DatabaseConnection(options);
  },
  inject: [OptionsProvider],
};

@Module({
  providers: [connectionFactory],
})
export class AppModule {}`;

const asyncProvider = `{
  provide: 'ASYNC_CONNECTION',
  useFactory: async () => {
    const connection = await createConnection();
    return connection;
  },
}`;

const exportProvider = `import { Module } from '@nl-framework/core';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}`;

export const metadata: Metadata = {
  title: "Providers · Nael Platform",
  description: "Learn about providers, dependency injection, and service management in Nael Platform.",
};

export default function ProvidersPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Overview</p>
        <h1 className="text-4xl font-semibold">Providers</h1>
        <p className="max-w-2xl text-muted-foreground">
          Providers are a fundamental concept in Nael. Many of the basic classes may be treated as providers – services, repositories, factories, helpers, and so on.
          The main idea of a provider is that it can be injected as a dependency; this means objects can create various relationships with each other.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Services</h2>
        <p className="text-muted-foreground">
          Let&apos;s start by creating a simple <code>UsersService</code>. This service will be responsible for data storage and retrieval,
          and is designed to be used by the <code>UsersController</code>, so it&apos;s a good candidate to be defined as a provider.
        </p>
        <CodeBlock code={basicService} title="users.service.ts" />
        <p className="text-sm text-muted-foreground">
          The <code>@Injectable()</code> decorator attaches metadata, which declares that <code>UsersService</code> is a class that can be managed
          by the Nael IoC container. This example also uses a <code>User</code> interface, which probably looks something like this:
        </p>
        <CodeBlock code={`export interface User {\n  id: number;\n  name: string;\n  email: string;\n}`} title="interfaces/user.interface.ts" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Dependency injection</h2>
        <p className="text-muted-foreground">
          Nael is built around the strong design pattern commonly known as Dependency injection. We recommend reading a great article about this concept
          in the official <Link className="text-primary" href="https://angular.io/guide/dependency-injection" rel="noreferrer" target="_blank">Angular</Link> documentation.
        </p>
        <p className="text-muted-foreground">
          In Nael, thanks to TypeScript capabilities, it&apos;s extremely easy to manage dependencies because they are resolved just by type.
          In the example below, Nael will resolve the <code>usersService</code> by creating and returning an instance of <code>UsersService</code> (or,
          in the normal case of a singleton, returning the existing instance if it has already been requested elsewhere). This dependency is resolved and passed to your controller&apos;s constructor:
        </p>
        <CodeBlock code={injectService} title="users.controller.ts" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Scopes</h2>
        <p className="text-muted-foreground">
          Providers normally have a lifetime (&quot;scope&quot;) synchronized with the application lifecycle. When the application is bootstrapped,
          every dependency must be resolved, and therefore every provider has to be instantiated. Similarly, when the application shuts down,
          each provider will be destroyed. However, there are ways to make your provider lifetime request-scoped as well.
        </p>
        <CodeBlock code={scopedProvider} title="Request-scoped provider" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Optional providers</h2>
        <p className="text-muted-foreground">
          Occasionally, you might have dependencies which do not necessarily have to be resolved. For instance, your class may depend on a configuration object,
          but if none is passed, the default values should be used. In such a case, the dependency becomes optional.
        </p>
        <CodeBlock code={optionalDeps} title="Optional dependency" />
        <p className="text-sm text-muted-foreground">
          In the example above, we are using the <code>@Optional()</code> decorator, which marks a dependency as optional.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Property-based injection</h2>
        <p className="text-muted-foreground">
          The technique we&apos;ve used so far is called constructor-based injection, as providers are injected via the constructor method.
          In some very specific cases, property-based injection might be useful. For instance, if your top-level class depends on either
          one or multiple providers, passing them all the way up by calling <code>super()</code> in sub-classes from the constructor can be very tedious.
        </p>
        <CodeBlock code={propertyInjection} title="Property injection" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Provider registration</h2>
        <p className="text-muted-foreground">
          Now that we have defined a provider (<code>UsersService</code>), and we have a consumer of that service (<code>UsersController</code>),
          we need to register the service with Nael so that it can perform the injection. We do this by editing our module file and adding
          the service to the <code>providers</code> array of the <code>@Module()</code> decorator.
        </p>
        <CodeBlock code={providerRegistration} title="users.module.ts" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Custom providers</h2>
        <p className="text-muted-foreground">
          Nael has a built-in inversion of control (&quot;IoC&quot;) container that resolves relationships between providers.
          This feature underlies the dependency injection feature described above, but is in fact far more powerful than what we&apos;ve described so far.
        </p>
        <h3 className="text-xl font-semibold">Value providers: useValue</h3>
        <p className="text-muted-foreground">
          The <code>useValue</code> syntax is useful for injecting a constant value, putting an external library into the Nael container,
          or replacing a real implementation with a mock object.
        </p>
        <CodeBlock code={customProvider} title="Custom value provider" />

        <h3 className="text-xl font-semibold">Class providers: useClass</h3>
        <p className="text-muted-foreground">
          The <code>useClass</code> syntax allows you to dynamically determine a class that a token should resolve to.
        </p>
        <CodeBlock code={useClass} title="Dynamic class provider" />

        <h3 className="text-xl font-semibold">Factory providers: useFactory</h3>
        <p className="text-muted-foreground">
          The <code>useFactory</code> syntax allows for creating providers dynamically. The actual provider will be supplied by the value
          returned from a factory function.
        </p>
        <CodeBlock code={useFactory} title="Factory provider" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Asynchronous providers</h2>
        <p className="text-muted-foreground">
          At times, the application start should be delayed until one or more asynchronous tasks are completed. For example,
          you may not want to start accepting requests until the connection with the database has been established. You can achieve this using asynchronous providers.
        </p>
        <CodeBlock code={asyncProvider} title="Async provider" />
        <p className="text-sm text-muted-foreground">
          The application will wait for the async provider to resolve before bootstrapping. This pattern works with <code>useFactory</code> syntax.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Export providers</h2>
        <p className="text-muted-foreground">
          Any provider that is part of a module can be exported. They can be exported either by their token or by their full provider object.
        </p>
        <CodeBlock code={exportProvider} title="Exporting providers" />
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">What&apos;s next?</h2>
        <p className="text-muted-foreground">
          Continue to <Link className="text-primary" href="/docs/modules">Modules</Link> to learn how to organize your application structure,
          or explore <Link className="text-primary" href="/docs/middleware">Middleware</Link> for request processing.
        </p>
      </section>
    </div>
  );
}
