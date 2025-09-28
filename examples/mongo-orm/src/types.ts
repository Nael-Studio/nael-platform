export interface ExampleConfig extends Record<string, unknown> {
  server: {
    host: string;
    port: number;
  };
}
