import type { TemplateFile } from './project-template';

export interface MigrationTemplateContext {
  /** Exported const name, e.g. `AddUsersEmailIndexMigration`. */
  className: string;
  /** Stable migration name persisted in history, e.g. `20260712_add-users-email-index`. */
  migrationName: string;
  /** File path relative to the migrations dir, without extension. */
  fileName: string;
}

const createMigrationFile = (ctx: MigrationTemplateContext): string => `import type { Migration, MigrationContext } from '@nl-framework/orm';

/**
 * ${ctx.migrationName}
 *
 * Runs inside a transaction when the topology supports it — always pass
 * \`session\` to writes so they join it.
 */
export const ${ctx.className}: Migration = {
  name: '${ctx.migrationName}',

  async up({ db, session }: MigrationContext): Promise<void> {
    // await db.collection('users').updateMany({}, { $set: { active: true } }, { session });
  },

  async down({ db, session }: MigrationContext): Promise<void> {
    // Reverse of up().
    // await db.collection('users').updateMany({}, { $unset: { active: '' } }, { session });
  },
};
`;

export const createMigrationTemplate = (ctx: MigrationTemplateContext): TemplateFile[] => [
  {
    path: `${ctx.fileName}.ts`,
    contents: createMigrationFile(ctx),
  },
];
