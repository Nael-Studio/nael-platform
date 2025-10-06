import type { GuideEntry } from '../../types';

export const testingGuide: GuideEntry = {
  id: 'testing',
  title: 'Testing Nael Applications',
  summary: 'Set up unit and integration testing for controllers, resolvers, and services.',
  steps: [
    'Use Bun Test (`bun test`) for fast unit tests.',
    'Mock framework interfaces by leveraging dependency injection tokens.',
    'Bootstrap lightweight platform adapters for integration tests.',
  ],
  codeSamples: [
    {
      heading: 'Service Unit Test',
      code: `import { describe, it, expect } from 'bun:test';
import { UsersService } from '../src/users.service';

describe('UsersService', () => {
  it('creates users', () => {
    const service = new UsersService();
    const user = service.create({ email: 'dev@nael.dev' });
    expect(user.email).toBe('dev@nael.dev');
  });
});
`,
    },
  ],
}