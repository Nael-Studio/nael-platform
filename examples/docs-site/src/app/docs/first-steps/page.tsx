import { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/shared/simple-code-block";

const installCli = `bun install --global @nl-framework/cli`;

const createProject = `nl new my-app`;

const mainFile = `import { NaelFactory } from '@nl-framework/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NaelFactory.create(AppModule);
  await app.listen(3000);
  console.log(\`Application is running on: http://localhost:3000\`);
}

bootstrap();`;

const appModule = `import { Module } from '@nl-framework/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}`;

const appController = `import { Controller, Get } from '@nl-framework/http';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}`;

const appService = `import { Injectable } from '@nl-framework/core';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello Nael Platform!';
  }
}`;

const runDev = `bun run dev`;

export const metadata: Metadata = {
  title: "First Steps · Nael Platform",
  description: "Learn how to create your first Nael Platform application with Bun runtime.",
};

export default function FirstStepsPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Overview</p>
        <h1 className="text-4xl font-semibold">First steps</h1>
        <p className="max-w-2xl text-muted-foreground">
          In this guide, you&apos;ll learn the core fundamentals of Nael Platform. To get familiar with the essential building blocks
          of the framework, we&apos;ll build a basic HTTP application with features that cover a lot of ground at an introductory level.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Language</h2>
        <p className="text-muted-foreground">
          Nael Platform is built entirely for <Link className="text-primary" href="https://bun.sh" rel="noreferrer" target="_blank">Bun</Link>,
          a fast all-in-one JavaScript runtime. We use TypeScript and leverage modern ES modules. While the framework is compatible with vanilla JavaScript,
          we strongly recommend using TypeScript for the best development experience.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Prerequisites</h2>
        <p className="text-muted-foreground">
          Please make sure that <Link className="text-primary" href="https://bun.sh/docs/installation" rel="noreferrer" target="_blank">Bun</Link> (version &gt;= 1.1.0) is installed on your operating system.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Setup</h2>
        <p className="text-muted-foreground">
          Setting up a new project is quite simple with the Nael CLI. With Bun installed, you can create a new project with the following commands:
        </p>
        <CodeBlock code={installCli} title="Install CLI globally" />
        <CodeBlock code={createProject} title="Create new project" />
        <p className="text-sm text-muted-foreground">
          The <code>my-app</code> directory will be created, modules will be installed, and several boilerplate files will be created and populated.
          Here&apos;s a brief overview of the core files:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li><code>src/main.ts</code> - The entry file of the application which uses the core function <code>NaelFactory</code> to create an application instance.</li>
          <li><code>src/app.module.ts</code> - The root module of the application.</li>
          <li><code>src/app.controller.ts</code> - A basic controller with a single route.</li>
          <li><code>src/app.service.ts</code> - A basic service with a single method.</li>
          <li><code>config/default.yaml</code> - Configuration file for different environments.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Main file</h2>
        <p className="text-muted-foreground">
          The <code>main.ts</code> includes an async function which will bootstrap our application:
        </p>
        <CodeBlock code={mainFile} title="src/main.ts" />
        <p className="text-sm text-muted-foreground">
          To create a Nael application instance, we use the core <code>NaelFactory</code> class. <code>NaelFactory</code> exposes a few static methods
          that allow creating an application instance. The <code>create()</code> method returns an application object, which implements the <code>INaelApplication</code> interface.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Application module</h2>
        <p className="text-muted-foreground">
          The application module (<code>AppModule</code>) is the root module of your application. Nael uses a module structure to organize components.
        </p>
        <CodeBlock code={appModule} title="src/app.module.ts" />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Controller</h2>
        <p className="text-muted-foreground">
          Controllers are responsible for handling incoming requests and returning responses to the client.
        </p>
        <CodeBlock code={appController} title="src/app.controller.ts" />
        <p className="text-sm text-muted-foreground">
          The <code>@Controller()</code> decorator is required to define a basic controller. The <code>@Get()</code> HTTP request method decorator
          tells Nael to create a handler for a specific endpoint for HTTP requests.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Provider</h2>
        <p className="text-muted-foreground">
          Providers are a fundamental concept in Nael. Many of the basic classes may be treated as providers – services, repositories, factories, helpers, and so on.
        </p>
        <CodeBlock code={appService} title="src/app.service.ts" />
        <p className="text-sm text-muted-foreground">
          The <code>@Injectable()</code> decorator attaches metadata, which declares that <code>AppService</code> is a class that can be managed by the Nael IoC container.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Running the application</h2>
        <p className="text-muted-foreground">
          Once the installation process is complete, you can run the following command to start the HTTP server:
        </p>
        <CodeBlock code={runDev} title="Start development server" />
        <p className="text-sm text-muted-foreground">
          This command starts the app with the HTTP server listening on the port defined in <code>config/default.yaml</code>. Once the application is running,
          open your browser and navigate to <code>http://localhost:3000/</code>. You should see the <code>Hello Nael Platform!</code> message.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">What&apos;s next?</h2>
        <p className="text-muted-foreground">
          Now that you have a basic understanding of how to create a Nael application, it&apos;s time to dive deeper into the framework&apos;s features.
          The next sections will cover <Link className="text-primary" href="/docs/controllers">Controllers</Link>, <Link className="text-primary" href="/docs/providers">Providers</Link>,
          and <Link className="text-primary" href="/docs/modules">Modules</Link> in more detail.
        </p>
      </section>
    </div>
  );
}
