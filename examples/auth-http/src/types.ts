export interface ExampleConfig extends Record<string, unknown> {
  app: {
    name: string;
  };
  server: {
    host: string;
    port: number;
  };
  auth: {
    baseUrl: string;
    secret?: string;
  };
  mongo: {
    uri: string;
    db: string;
  };
}
