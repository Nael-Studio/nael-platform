export interface ExampleConfig {
  server?: {
    host?: string;
    port?: number;
  };
  mongodb?: {
    uri?: string;
    dbName?: string;
  };
}
