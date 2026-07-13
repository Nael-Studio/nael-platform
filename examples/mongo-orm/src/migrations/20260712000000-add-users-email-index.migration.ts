import type { Migration, MigrationContext } from '@nl-framework/orm';

/**
 * 20260712000000_add-users-email-index
 *
 * Ensures a unique index on `users.email`. Runs inside a transaction when the
 * topology supports it — pass `session` to every write so it joins.
 */
export const AddUsersEmailIndexMigration: Migration = {
  name: '20260712000000_add-users-email-index',

  async up({ db }: MigrationContext): Promise<void> {
    await db.collection('users').createIndex({ email: 1 }, { unique: true, name: 'users_email_unique' });
  },

  async down({ db }: MigrationContext): Promise<void> {
    await db.collection('users').dropIndex('users_email_unique');
  },
};
