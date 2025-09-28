import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { Application, Module } from '@nl-framework/core';
import { LoggerFactory } from '@nl-framework/logger';
import { AuthModule, BetterAuthService, BetterAuthModuleOptions } from '../src';

const createApp = async (options: BetterAuthModuleOptions) => {
  @Module({
    imports: [AuthModule.forRoot(options)],
    providers: [],
  })
  class TestModule {}

  const app = new Application();
  const context = await app.bootstrap(TestModule);
  return { app, context };
};

describe('AuthModule', () => {
  let app: Application | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    app = undefined;
  });

  it('authenticates with the in-memory fallback adapter by default', async () => {
    const defaultPassword = 'p@ssword1';
    const { app: currentApp, context } = await createApp({
      defaultUsers: [
        {
          email: 'user@example.com',
          password: defaultPassword,
          roles: ['admin'],
        },
      ],
    });
    app = currentApp;

    const authService = await context.get(BetterAuthService);
    const session = await authService.signIn({ email: 'user@example.com', password: defaultPassword });

    expect(session.userId).toBeDefined();
    expect(await authService.authorize(session, { roles: ['admin'] })).toBe(true);

    await authService.signOut(session.sessionId);
  });

  it('applies BetterAuth plugins when provided', async () => {
    const pluginUserEmail = 'plugin@example.com';
    const pluginUserPassword = 'secret';

    const plugin = async (adapter: any) => {
      if (typeof adapter.register === 'function') {
        await adapter.register({
          email: pluginUserEmail,
          password: pluginUserPassword,
          roles: ['contributor'],
        });
      }
    };

    const { app: currentApp, context } = await createApp({
      defaultUsers: [],
      plugins: [plugin],
    });
    app = currentApp;

    const authService = await context.get(BetterAuthService);
    const session = await authService.signIn({ email: pluginUserEmail, password: pluginUserPassword });

    expect(session.roles).toContain('contributor');
  });
});
