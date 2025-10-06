import { authExamples } from './auth-examples';
import { graphqlExamples } from './graphql-examples';
import { httpExamples } from './http-examples';
import { microservicesExamples } from './microservices-examples';
import type { ExampleCatalogEntry } from '../../types';

export const exampleCatalog: ExampleCatalogEntry[] = [
  ...httpExamples,
  ...graphqlExamples,
  ...authExamples,
  ...microservicesExamples,
];

export function findExampleById(id: string): ExampleCatalogEntry | undefined {
  return exampleCatalog.find((example) => example.id === id);
}

export function findExamplesByCategory(category: string): ExampleCatalogEntry[] {
  return exampleCatalog.filter((example) => example.category === category);
}
