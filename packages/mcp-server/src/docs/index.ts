import { apiReference } from './api';
import { exampleCatalog } from './examples';
import { guides } from './guides';
import { packageDocumentationMap, packageList, packageKeys } from './packages';

export const docs = {
  packages: packageDocumentationMap,
  packageList,
  packageKeys,
  examples: exampleCatalog,
  guides,
  api: apiReference,
};
