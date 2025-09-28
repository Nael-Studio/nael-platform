import type { Seeder, SeederContext } from '@nl-framework/orm';
import { User } from '../user.document';

export class InitialUsersSeed implements Seeder {
  async run(context: SeederContext): Promise<void> {
    const repository = await context.getRepository(User);
    const count = await repository.count({}, { withDeleted: true });

    if (count > 0) {
      return;
    }

    await repository.insertMany([
      {
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
      },
      {
        email: 'jane.doe@example.com',
        name: 'Jane Doe',
        role: 'member',
      },
    ]);
  }
}
