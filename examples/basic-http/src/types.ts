export interface ExampleConfig {
  app: {
    name: string;
    greeting: string;
  };
  server: {
    port: number;
    host?: string;
  };
  [key: string]: unknown;
}
