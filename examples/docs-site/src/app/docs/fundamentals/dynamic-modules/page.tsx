import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const forRootSnippet = `import { DynamicModule, Module } from '@nl-framework/core';
import { MAILER_OPTIONS } from './mailer.constants';
import { MailerService } from './mailer.service';

type MailerModuleOptions = {
  transport: string;
  defaults?: Record<string, unknown>;
};

@Module({})
export class MailerModule {
  static register(options: MailerModuleOptions): DynamicModule {
    return {
      module: MailerModule,
      providers: [
        MailerService,
        { provide: MAILER_OPTIONS, useValue: options },
      ],
      exports: [MailerService],
    };
  }
}`;

const forFeatureSnippet = `// feature/users/users.module.ts
import { Module } from '@nl-framework/core';
import { MailerModule } from '../mailer/mailer.module';
import { UsersService } from './users.service';

@Module({
  imports: [
    MailerModule.register({
      transport: 'smtp://send.example.com',
      defaults: { from: 'support@example.com' },
    }),
  ],
  providers: [UsersService],
})
export class UsersModule {}`;

const asyncSnippet = `import { DynamicModule, Module } from '@nl-framework/core';
import { ConfigModule, ConfigService } from '@nl-framework/config';
import { MAILER_OPTIONS } from './mailer.constants';
import { MailerService } from './mailer.service';

type MailerModuleAsyncOptions = {
  imports?: DynamicModule[];
  inject?: any[];
  useFactory: (...args: any[]) => Promise<MailerModuleOptions> | MailerModuleOptions;
};

@Module({})
export class MailerModule {
  static registerAsync(options: MailerModuleAsyncOptions): DynamicModule {
    return {
      module: MailerModule,
      imports: options.imports ?? [],
      providers: [
        MailerService,
        {
          provide: MAILER_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
      ],
      exports: [MailerService],
    };
  }
}

// root module
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MailerModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        transport: config.get('smtp.url'),
        defaults: { from: config.get('smtp.from') },
      }),
    }),
  ],
})
export class AppModule {}`;

const reExportSnippet = `@Module({
  imports: [MailerModule.register({ transport: 'smtp://...' })],
  exports: [MailerModule],
})
export class MessagingSharedModule {}

@Module({
  imports: [MessagingSharedModule],
})
export class NotificationsModule {}`;

export const metadata: Metadata = {
  title: "Dynamic modules · Nael Platform",
  description:
    "Design modules that accept configuration via register/registerAsync so features can be reused across applications.",
};

export default function DynamicModulesPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-50">Fundamentals</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Dynamic modules</h1>
        <p className="text-lg text-muted-foreground">
          Dynamic modules expose a factory API&mdash;usually called <code>register()</code> or <code>forRoot()</code>&mdash;so consumers can
          configure providers on the fly. They are the building block for reusable libraries such as Config, Auth, or Scheduler.
        </p>
      </div>

      <section className="space-y-4" id="for-root">
        <h2 className="text-2xl font-semibold">Synchronous register/forRoot</h2>
        <p className="text-muted-foreground">
          Return a <code>DynamicModule</code> object with the <code>module</code>, <code>providers</code>, and <code>exports</code> fields.
          The calling module decides the configuration, while your feature stays stateless.
        </p>
        <CodeBlock code={forRootSnippet} title="MailerModule.register" />
      </section>

      <section className="space-y-4" id="feature">
        <h2 className="text-2xl font-semibold">Consuming dynamic modules</h2>
        <p className="text-muted-foreground">
          Feature modules import the configured version just like any other module. Each call to <code>register()</code> produces its own provider
          graph, so different features can point to different transports without interfering with each other.
        </p>
        <CodeBlock code={forFeatureSnippet} title="UsersModule importing MailerModule" />
      </section>

      <section className="space-y-4" id="register-async">
        <h2 className="text-2xl font-semibold">Asynchronous configuration</h2>
        <p className="text-muted-foreground">
          Use <code>registerAsync()</code>/<code>forRootAsync()</code> when you need to read environment variables, fetch secrets, or build the option
          object asynchronously. You can delegate to <code>useFactory</code>, <code>useClass</code>, or <code>useExisting</code> just like any other provider.
        </p>
        <CodeBlock code={asyncSnippet} title="registerAsync with ConfigService" />
      </section>

      <section className="space-y-4" id="re-export">
        <h2 className="text-2xl font-semibold">Sharing configured modules</h2>
        <p className="text-muted-foreground">
          If multiple feature modules need the same configuration (e.g., one SMTP transport), wrap the dynamic module in a shared module and export it.
          Downstream modules simply import the shared module to reuse the providers.
        </p>
        <CodeBlock code={reExportSnippet} title="Re-export a configured module" />
        <p className="text-sm text-muted-foreground">
          This mirrors NestJS&rsquo;s <code>forRoot()</code>/<code>forFeature()</code> pattern and keeps your dependency graph explicit.
        </p>
      </section>
    </article>
  );
}
