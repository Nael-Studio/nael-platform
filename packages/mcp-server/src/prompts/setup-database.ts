import type { PromptTemplate } from './types';

export const setupDatabasePrompt: PromptTemplate = {
  name: 'setup-database',
  description: 'Generate database module scaffolding for MongoDB or PostgreSQL using Nael ORM and config.',
  arguments: [
    { name: 'database', description: "Database type ('mongodb' | 'postgresql')", required: true },
    { name: 'moduleName', description: 'Module name (e.g., DatabaseModule)', required: false },
  ],
  build(args) {
    const dbType = (args.database ?? 'mongodb').toLowerCase();
    const moduleName = args.moduleName ?? 'DatabaseModule';
    const isMongo = dbType.startsWith('mongo');

    if (isMongo) {
      return `import { Module } from '@nl-framework/core';
import { MongoOrmModule } from '@nl-framework/orm';

@Module({
  imports: [
    MongoOrmModule.forRoot({
      uri: process.env.MONGODB_URL ?? 'mongodb://localhost:27017/nael',
    }),
  ],
  exports: [MongoOrmModule],
})
export class ${moduleName} {}
`;
    }

    return `import { Module } from '@nl-framework/core';
import { ConfigModule, ConfigService } from '@nl-framework/config';

@Module({
  imports: [
    ConfigModule.forRoot({ filePath: 'config/default.yaml' }),
  ],
})
export class ${moduleName} {
  constructor(private readonly config: ConfigService) {
    const url = this.config.get('database.url', 'postgres://localhost:5432/nael');
    console.log('Connect to PostgreSQL via', url);
  }
}
`;
  },
};
