import type { PackageDocumentation, PackageName } from '../../types';
import { corePackageDocs } from './core';

export const packageDocs: Record<PackageName, PackageDocumentation> = {
  core: corePackageDocs,
  http: corePackageDocs, // Placeholder - will implement next
  graphql: corePackageDocs, // Placeholder
  platform: corePackageDocs, // Placeholder
  config: corePackageDocs, // Placeholder
  logger: corePackageDocs, // Placeholder
  orm: corePackageDocs, // Placeholder
  auth: corePackageDocs, // Placeholder
  microservices: corePackageDocs, // Placeholder
};

export function getPackageDocumentation(packageName: PackageName): PackageDocumentation | null {
  return packageDocs[packageName] || null;
}

export function listAllPackages(): Array<{ name: string; description: string }> {
  return Object.entries(packageDocs).map(([name, docs]) => ({
    name: `@nl-framework/${name}`,
    description: docs.description
  }));
}
