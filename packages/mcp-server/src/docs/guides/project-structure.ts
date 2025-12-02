import type { GuideEntry } from '../../types';

export const projectStructureGuide: GuideEntry = {
  id: 'project-structure',
  title: 'Recommended Project Structure',
  summary:
    'Organize NL Framework Framework projects by feature modules with colocated controllers, services, resolvers, models, and persistence artifacts.',
  steps: [
    'Group code by feature (for example, `users/`, `billing/`, `orders/`) instead of technical layers.',
    'Each feature folder exposes a `*.module.ts` file that wires controllers, resolvers, models, documents, and providers.',
    'Keep injectable services beside their module, and export shared types through a local `types.ts`.',
    'Store bootstrapping entrypoints such as `main.ts` and data seeds at the root of the `src/` directory.',
  ],
  codeSamples: [
    {
      heading: 'Feature-first layout (from `examples/mongo-orm`)',
      description:
        'The `mongo-orm` example demonstrates how modules can wrap controllers, resolvers, documents, models, seeds, and services inside a dedicated folder.',
      code: `src/
  app.module.ts
  main.ts
  seed.ts
  types.ts
  users/
    users.module.ts
    users.controller.ts
    users.service.ts
    user.document.ts
    models/
      user.model.ts
    seeds/
      initial-users.seed.ts
`,
    },
    {
      heading: 'UsersModule metadata',
      description:
        'Register controllers and providers on the module so the platform discovers them automatically.',
      code: `@Module({
  controllers: [UsersController],
  providers: [UsersService, UserDocument],
})
export class UsersModule {}
`,
    },
  ],
  relatedPackages: ['@nl-framework/core', '@nl-framework/platform', '@nl-framework/orm'],
};
