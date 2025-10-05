#!/usr/bin/env node

import { NaelMCPServer } from './server.js';

/**
 * Nael Framework MCP Server Entry Point
 * 
 * This server exposes Nael Framework documentation to AI assistants
 * via the Model Context Protocol (MCP).
 * 
 * Usage:
 *   bunx @nl-framework/mcp-server
 * 
 * Or add to Claude Desktop config:
 * {
 *   "mcpServers": {
 *     "nael-framework": {
 *       "command": "bunx",
 *       "args": ["@nl-framework/mcp-server"]
 *     }
 *   }
 * }
 */

async function main() {
  if (process.argv.includes('--http')) {
    await import('./http-server.js');
    return;
  }

  const server = new NaelMCPServer();
  await server.run();
}

main().catch((error) => {
  console.error('Fatal error in MCP server:', error);
  process.exit(1);
});
