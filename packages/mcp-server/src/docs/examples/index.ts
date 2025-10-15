import { authExamples } from './auth-examples';
import { cliExamples } from './cli-examples';
import { graphqlExamples } from './graphql-examples';
import { httpExamples } from './http-examples';
import { microservicesExamples } from './microservices-examples';
import { schedulerExamples } from './scheduler-examples';
import { ormExamples } from './orm-examples';
import type { ExampleCatalogEntry } from '../../types';

export const exampleCatalog: ExampleCatalogEntry[] = [
  ...httpExamples,
  ...graphqlExamples,
  ...authExamples,
  ...microservicesExamples,
  ...cliExamples,
  ...schedulerExamples,
  ...ormExamples,
];

export function findExampleById(id: string): ExampleCatalogEntry | undefined {
  return exampleCatalog.find((example) => example.id === id);
}

export function findExamplesByCategory(category: string): ExampleCatalogEntry[] {
  return exampleCatalog.filter((example) => example.category === category);
}
