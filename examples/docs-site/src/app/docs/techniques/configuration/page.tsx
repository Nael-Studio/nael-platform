import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/shared/simple-code-block";

const loaderSnippet = `import { ConfigModule } from '@nl-framework/config';
import { Module } from '@nl-framework/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      dir: 'config',
      path: 'env.yaml',
      overrides: {
        app: { host: '0.0.0.0', port: 4000 },
      },
    }),
  ],
})
export class AppModule {}`;

const yamlSnippet = `# config/default.yaml
app:
  port: 3000
  host: localhost
  features:
    cache: false

# config/production.yaml
app:
  port: 8080
  features:
    cache: true`;

const featureSnippet = `import { Inject, Injectable, Module } from '@nl-framework/core';
import { ConfigModule, getConfigFeatureToken } from '@nl-framework/config';

const databaseConfigToken = getConfigFeatureToken('database');

@Injectable()
class DatabaseClient {
  constructor(@Inject(databaseConfigToken) private readonly config: { url: string }) {}

  connect() {
    return connectToDatabase(this.config.url);
  }
}

@Module({
  imports: [
    ConfigModule.forFeature({
      path: 'database',
      transform: (value) => ({
        url: value.url ?? 'mongodb://localhost:27017/app',
      }),
    }),
  ],
  providers: [DatabaseClient],
})
export class DatabaseModule {}`;

const asyncSnippet = `ConfigModule.forRootAsync({
  useFactory: async (secrets: SecretsService) => ({
    dir: 'config',
    overrides: {
      database: {
        password: await secrets.get('db_password'),
      },
    },
  }),
  inject: [SecretsService],
});`;

const usageSnippet = `import { Injectable } from '@nl-framework/core';
import { ConfigService } from '@nl-framework/config';

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  port() {
    return this.config.get<number>('app.port', 3000);
  }

  featureEnabled(name: string) {
    return this.config.get<boolean>('app.features.' + name, false);
  }
}`;

export const metadata: Metadata = {
  title: "Configuration · Nael Platform",
  description: "Structure strongly typed configuration with ConfigModule, ConfigService, and feature slices.",
};

export default function ConfigurationPage() {
  return (
    <article className="space-y-8">
      <div className="space-y-3">
        <Badge className="bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-50">Techniques</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">Configuration</h1>
        <p className="text-lg text-muted-foreground">
          Nael ships with a configuration module that layers YAML files, environment-specific overrides, and runtime factories into a single
          <code className="mx-1">ConfigService</code>. This page walks through structuring config directories, injecting typed slices, and adapting values
          for different deployment targets.
        </p>
      </div>

      <section className="space-y-4" id="loading">
        <h2 className="text-2xl font-semibold">Loading configuration files</h2>
        <p className="text-muted-foreground">
          Register <code>ConfigModule.forRoot()</code> once near your root module. By default it looks for <code>default.yaml</code>, then
          <code>{`<NODE_ENV>.yaml`}</code>, and finally <code>env.yaml</code> inside the provided directory. You can also inline overrides for values that
          should never live in source control.
        </p>
        <CodeBlock code={loaderSnippet} title="Bootstrapping ConfigModule" />
        <CodeBlock code={yamlSnippet} title="Layered YAML files" />
        <p className="text-sm text-muted-foreground">
          The loader deep-merges files in order. Production-specific keys override defaults, while missing keys fall back to the base file.
        </p>
      </section>

      <section className="space-y-4" id="injecting">
        <h2 className="text-2xl font-semibold">Injecting ConfigService</h2>
        <p className="text-muted-foreground">
          Once the module is registered, inject <code>ConfigService</code> anywhere. Use <code>get()</code> with dot-paths to retrieve nested values and
          provide sensible defaults.
        </p>
        <CodeBlock code={usageSnippet} title="Reading configuration values" />
      </section>

      <section className="space-y-4" id="features">
        <h2 className="text-2xl font-semibold">Feature slices with forFeature()</h2>
        <p className="text-muted-foreground">
          Large apps benefit from injecting only the slice they need. <code>ConfigModule.forFeature()</code> publishes a token that resolves to a specific
          subtree (optionally transformed). This prevents unrelated modules from depending on the entire config object.
        </p>
        <CodeBlock code={featureSnippet} title="Provide a typed database config" />
      </section>

      <section className="space-y-4" id="async">
        <h2 className="text-2xl font-semibold">Async configuration sources</h2>
        <p className="text-muted-foreground">
          When values originate from secret stores or other providers, use <code>forRootAsync()</code>. The factory receives injected dependencies and
          can return overrides or even different directories based on runtime signals.
        </p>
        <CodeBlock code={asyncSnippet} title="Fetch overrides from a secrets manager" />
      </section>

      <section className="space-y-4" id="tips">
        <h2 className="text-2xl font-semibold">Best practices</h2>
        <ul className="list-disc pl-6 text-muted-foreground">
          <li>Keep environment-specific overrides small; prefer defaults in <code>default.yaml</code> for readability.</li>
          <li>Use <code>ConfigModule.forFeature</code> with a <code>transform</code> function to validate and coerce types.</li>
          <li>Check in sample files (e.g., <code>env.example.yaml</code>) and document required environment variables for newcomers.</li>
        </ul>
      </section>
    </article>
  );
}
