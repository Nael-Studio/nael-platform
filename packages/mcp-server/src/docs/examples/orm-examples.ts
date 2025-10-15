import type { ExampleCatalogEntry } from '../../types';

export const ormExamples: ExampleCatalogEntry[] = [
  {
    id: 'orm-save-and-reload',
    category: 'orm',
    title: 'Save and Reload with String/ObjectId IDs',
    description: 'Demonstrates the repository `save` helper synchronizing `id` and `_id` regardless of whether you provide strings or ObjectIds.',
    code: `import { ObjectId } from 'mongodb';

const created = await repo.save({ email: 'demo@nael.dev' });
// created.id is a string; created._id is an ObjectId

await repo.save({ id: created.id, email: 'updated@nael.dev' });
const reloaded = await repo.findById(created.id);

console.log(reloaded._id instanceof ObjectId); // true
console.log(reloaded.email); // 'updated@nael.dev'
`,
    explanation: 'The updated repository logic normalizes identifiers in both directions, making pagination or relation lookups straightforward.',
    tags: ['orm', 'mongo'],
    relatedPackages: ['@nl-framework/orm'],
  },
  {
    id: 'orm-save-reload-script',
    category: 'orm',
    title: 'Execute the Real Mongo Save/Reload Script',
    description: 'Run the bundled script against a local Mongo instance to verify repository behaviour end-to-end.',
    code: `bun run packages/orm/tests/scripts/save-reload-real-mongo.ts --database mongodb://localhost:27017/nael`,
    explanation: 'The script inserts, updates, and reloads documents using both string and ObjectId identifiers to validate real database interactions.',
    tags: ['orm', 'scripts'],
    relatedPackages: ['@nl-framework/orm'],
  },
];
