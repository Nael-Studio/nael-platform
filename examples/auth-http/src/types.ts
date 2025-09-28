export interface DefaultUserConfig {
  email: string;
  password: string;
  roles?: string[];
  metadata?: Record<string, unknown>;
}

export interface AuthExampleConfig {
  app: {
    name: string;
    defaultUsers: DefaultUserConfig[];
  };
  server: {
    port: number;
    host?: string;
  };
  database: {
    uri: string;
    dbName: string;
  };
  auth?: {
    sessionTtlMs?: number;
  };
  [key: string]: unknown;
}
