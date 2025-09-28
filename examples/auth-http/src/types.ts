export interface DefaultUserConfig {
  email: string;
  password: string;
  roles?: string[];
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
  [key: string]: unknown;
}
