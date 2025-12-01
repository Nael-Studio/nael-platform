export type DocsNavItem = {
  title: string;
  href: string;
};

export type DocsNavSection = {
  title: string;
  items: DocsNavItem[];
};

export const docsNav: DocsNavSection[] = [
  {
    title: "Overview",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "First steps", href: "/docs/first-steps" },
      { title: "Controllers", href: "/docs/controllers" },
      { title: "Providers", href: "/docs/providers" },
      { title: "Modules", href: "/docs/modules" },
      { title: "Middleware", href: "/docs/middleware" },
      { title: "Exception filters", href: "/docs/exception-filters" },
      { title: "Pipes", href: "/docs/pipes" },
      { title: "Guards", href: "/docs/guards" },
      { title: "Interceptors", href: "/docs/interceptors" },
      { title: "Custom decorators", href: "/docs/custom-decorators" },
    ],
  },
  {
    title: "Fundamentals",
    items: [
      { title: "Custom providers", href: "/docs/fundamentals/custom-providers" },
      { title: "Async providers", href: "/docs/fundamentals/async-providers" },
      { title: "Dynamic modules", href: "/docs/fundamentals/dynamic-modules" },
      { title: "Injection scopes", href: "/docs/fundamentals/injection-scopes" },
      { title: "Circular dependency", href: "/docs/fundamentals/circular-dependency" },
      { title: "Module reference", href: "/docs/fundamentals/module-reference" },
      { title: "Lazy-loading modules", href: "/docs/fundamentals/lazy-loading" },
      { title: "Execution context", href: "/docs/fundamentals/execution-context" },
      { title: "Lifecycle events", href: "/docs/fundamentals/lifecycle-events" },
      { title: "Platform agnosticism", href: "/docs/fundamentals/platform-agnosticism" },
      { title: "Testing", href: "/docs/fundamentals/testing" },
    ],
  },
  {
    title: "Techniques",
    items: [
      { title: "Configuration", href: "/docs/techniques/configuration" },
      { title: "Database", href: "/docs/techniques/database" },
      { title: "Validation", href: "/docs/techniques/validation" },
      { title: "Caching", href: "/docs/techniques/caching" },
      { title: "Serialization", href: "/docs/techniques/serialization" },
      { title: "Versioning", href: "/docs/techniques/versioning" },
      { title: "Task scheduling", href: "/docs/techniques/task-scheduling" },
      { title: "Queues", href: "/docs/techniques/queues" },
      { title: "Logging", href: "/docs/techniques/logging" },
      { title: "Cookies", href: "/docs/techniques/cookies" },
      { title: "Events", href: "/docs/techniques/events" },
      { title: "Compression", href: "/docs/techniques/compression" },
      { title: "File upload", href: "/docs/techniques/file-upload" },
      { title: "Streaming files", href: "/docs/techniques/streaming-files" },
      { title: "HTTP module", href: "/docs/techniques/http-module" },
      { title: "Session", href: "/docs/techniques/session" },
    ],
  },
  {
    title: "Auth",
    items: [
      { title: "Overview", href: "/docs/auth" },
      { title: "REST", href: "/docs/auth/rest" },
      { title: "GraphQL", href: "/docs/auth/graphql" },
      { title: "Multi-tenant", href: "/docs/auth/multi-tenant" },
    ],
  },
  {
    title: "ORM",
    items: [
      { title: "Overview", href: "/docs/orm/overview" },
      { title: "Entities", href: "/docs/orm/entities" },
      { title: "Repositories", href: "/docs/orm/repositories" },
      { title: "Seeding", href: "/docs/orm/seeding" },
      { title: "Multi-tenancy", href: "/docs/orm/multi-tenancy" },
      { title: "Queries", href: "/docs/orm/queries" },
    ],
  },
  {
    title: "GraphQL",
    items: [
      { title: "Quick start", href: "/docs/graphql/quick-start" },
      { title: "Resolvers", href: "/docs/graphql/resolvers" },
      { title: "Mutations", href: "/docs/graphql/mutations" },
      { title: "Subscriptions", href: "/docs/graphql/subscriptions" },
      { title: "Scalars", href: "/docs/graphql/scalars" },
      { title: "Directives", href: "/docs/graphql/directives" },
      { title: "Enums", href: "/docs/graphql/enums" },
      { title: "Plugins", href: "/docs/graphql/plugins" },
      { title: "Federation", href: "/docs/graphql/federation" },
      { title: "Gateways", href: "/docs/graphql/gateways" },
      { title: "Exception handling", href: "/docs/graphql/exception-handling" },
    ],
  },
  {
    title: "Microservices",
    items: [
      { title: "Overview", href: "/docs/microservices/overview" },
      { title: "Dapr", href: "/docs/microservices/dapr" },
      { title: "Message patterns", href: "/docs/microservices/message-patterns" },
      { title: "Exception filters", href: "/docs/microservices/exception-filters" },
      { title: "Pipes", href: "/docs/microservices/pipes" },
      { title: "Guards", href: "/docs/microservices/guards" },
      { title: "Interceptors", href: "/docs/microservices/interceptors" },
    ],
  },
  {
    title: "CLI",
    items: [
      { title: "Overview", href: "/docs/cli" },
      { title: "Workspaces", href: "/docs/cli/workspaces" },
      { title: "Libraries", href: "/docs/cli/libraries" },
      { title: "Usage", href: "/docs/cli/usage" },
      { title: "Scripts", href: "/docs/cli/scripts" },
    ],
  },
];
