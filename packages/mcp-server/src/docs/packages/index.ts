import type { PackageDocumentation, PackageName } from '../../types.js';
import { corePackageDocs } from './core.js';
import { httpPackageDocs } from './http.js';
import { graphqlPackageDocs } from './graphql.js';
import { platformPackageDocs } from './platform.js';
import { configPackageDocs } from './config.js';
import { loggerPackageDocs } from './logger.js';
import { ormPackageDocs } from './orm.js';
import { authPackageDocs } from './auth.js';
import { microservicesPackageDocs } from './microservices.js';

/**
 * Central registry of all package documentation
 */
export const packageDocs = new Map<string, PackageDocumentation>([
  ['http', httpPackageDocs],
  ['graphql', graphqlPackageDocs],
  ['platform', platformPackageDocs],
  ['config', configPackageDocs],
  ['logger', loggerPackageDocs],
  ['orm', ormPackageDocs],
  ['auth', authPackageDocs],
  ['microservices', microservicesPackageDocs],
]);

export function getPackageDocumentation(packageName: PackageName): PackageDocumentation {
  return packageDocs.get(packageName)!;
}

export function listAllPackages(): Array<{ name: string; description: string }> {
  return Object.entries(packageDocs).map(([name, docs]) => ({
    name: `@nl-framework/${name}`,
    description: docs.description
  }));
}
