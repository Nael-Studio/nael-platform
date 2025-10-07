import { coreDocumentation } from './core';
import type { PackageDocumentation } from '../../types';

import { authDocumentation } from './auth';
import { cliDocumentation } from './cli';
import { configDocumentation } from './config';
import { graphqlDocumentation } from './graphql';
import { httpDocumentation } from './http';
import { loggerDocumentation } from './logger';
import { microservicesDocumentation } from './microservices';
import { ormDocumentation } from './orm';
import { platformDocumentation } from './platform';

export const packageDocumentationMap: Record<string, PackageDocumentation> = {
  core: coreDocumentation,
  http: httpDocumentation,
  graphql: graphqlDocumentation,
  platform: platformDocumentation,
  config: configDocumentation,
  logger: loggerDocumentation,
  orm: ormDocumentation,
  auth: authDocumentation,
  microservices: microservicesDocumentation,
  cli: cliDocumentation,
};

type PackageKey = keyof typeof packageDocumentationMap;

export const packageList: Array<{
  key: PackageKey;
  name: string;
  description: string;
  highlights: string[];
}> = [
  {
    key: 'core',
    name: '@nl-framework/core',
    description: 'Dependency injection, module system, and application lifecycle primitives.',
    highlights: ['DI container', 'module metadata', 'lifecycle hooks'],
  },
  {
    key: 'http',
    name: '@nl-framework/http',
    description: 'Expressive HTTP routing layer with controllers, middleware, and interceptors.',
    highlights: ['Controllers', 'Routing', 'Pipelines'],
  },
  {
    key: 'graphql',
    name: '@nl-framework/graphql',
    description: 'Code-first GraphQL tooling powered by Apollo Server and schema-first ergonomics.',
    highlights: ['Resolvers', 'Federation', 'Schema generation'],
  },
  {
    key: 'platform',
    name: '@nl-framework/platform',
    description: 'Unified bootstrap utilities for HTTP, GraphQL, and microservices applications.',
    highlights: ['Bootstrap', 'Adapters', 'Testing harness'],
  },
  {
    key: 'config',
    name: '@nl-framework/config',
    description: 'Hierarchical configuration loader with YAML support and environment overrides.',
    highlights: ['YAML', 'Schema validation', 'Hot reload'],
  },
  {
    key: 'logger',
    name: '@nl-framework/logger',
    description: 'Structured logging with pluggable transports and request-scoped contexts.',
    highlights: ['JSON logs', 'Transports', 'Correlation IDs'],
  },
  {
    key: 'orm',
    name: '@nl-framework/orm',
    description: 'MongoDB ODM with repository abstractions, schema decorators, and transactions.',
    highlights: ['Repositories', 'Indexes', 'Transactions'],
  },
  {
    key: 'auth',
    name: '@nl-framework/auth',
    description: 'Better Auth integration for session management, guards, and GraphQL directives.',
    highlights: ['Session routes', 'Guards', 'Resolvers'],
  },
  {
    key: 'microservices',
    name: '@nl-framework/microservices',
    description: 'Dapr-backed microservice toolkit with message patterns and workflow orchestration.',
    highlights: ['Dapr pub/sub', 'Workflows', 'State management'],
  },
  {
    key: 'cli',
    name: '@nl-framework/cli',
    description: 'Bun-native scaffolding CLI for Nael services, modules, and reusable libraries.',
    highlights: ['Scaffolding', 'Generators', 'Automation'],
  },
];

export const packageKeys = Object.keys(packageDocumentationMap) as PackageKey[];
