import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createNL FrameworkMcpServer } from './server';

async function main(): Promise<void> {
  const server = createNL FrameworkMcpServer();
  const transport = new StdioServerTransport();

  transport.onerror = (error: Error) => {
    console.error('[mcp-server] transport error', error);
  };

  transport.onclose = () => {
    console.error('[mcp-server] transport closed');
    process.exit(0);
  };

  try {
    await server.connect(transport);
  } catch (error) {
    console.error('[mcp-server] failed to start', error);
    process.exit(1);
  }
}

void main();
