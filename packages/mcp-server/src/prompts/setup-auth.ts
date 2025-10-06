import type { PromptTemplate } from './types';

function formatProviders(raw?: string): string[] {
  if (!raw) return ['email'];
  return raw
    .split(',')
    .map((provider) => provider.trim())
    .filter(Boolean);
}

export const setupAuthPrompt: PromptTemplate = {
  name: 'setup-auth',
  description: 'Generate authentication setup with Better Auth integration.',
  arguments: [
    { name: 'providers', description: 'Auth providers (e.g., email,google,github)', required: false },
    { name: 'database', description: "Database type ('mongodb' or 'postgres')", required: false },
  ],
  build(args) {
    const providers = formatProviders(args.providers);
    const database = args.database ?? 'mongodb';
    const adapterImport =
      database === 'postgres'
        ? "import { createPostgresAdapter } from '@better-auth/postgres';"
        : "import { createMongoAdapter } from '@better-auth/mongodb';";
    const adapterFactory =
      database === 'postgres'
        ? 'createPostgresAdapter({ connectionString: process.env.POSTGRES_URL ?? "" })'
        : 'createMongoAdapter({ uri: process.env.MONGODB_URL ?? "mongodb://localhost:27017/nael" })';

    return `${adapterImport}
import { Module } from '@nl-framework/core';
import { AuthModule, registerBetterAuthHttpRoutes } from '@nl-framework/auth';

@Module({
  imports: [
    AuthModule.forRoot({
      providers: ${JSON.stringify(providers)},
      adapter: ${adapterFactory},
    }),
  ],
})
export class AuthEnabledModule {
  constructor() {
    registerBetterAuthHttpRoutes();
  }
}
`;
  },
};
