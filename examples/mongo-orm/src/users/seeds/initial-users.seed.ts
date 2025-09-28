import { Seed, type Seeder, type SeederContext } from '@nl-framework/orm';
import { User } from '../user.document';

@Seed({ name: 'initial-users' })
export class InitialUsersSeed implements Seeder {
  async run(context: SeederContext): Promise<void> {
    const repository = await context.getRepository(User);

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
