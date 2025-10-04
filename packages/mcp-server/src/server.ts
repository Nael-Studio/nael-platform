import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { listPackagesTool, handleListPackages } from './tools/list-packages.js';
import { getPackageDocsTool, handleGetPackageDocs } from './tools/get-package-docs.js';
import { searchApiTool, handleSearchApi } from './tools/search-api.js';
import { getExampleTool, handleGetExample } from './tools/get-example.js';
import { getDecoratorInfoTool, handleGetDecoratorInfo } from './tools/get-decorator-info.js';
import { getBestPracticesTool, handleGetBestPractices } from './tools/get-best-practices.js';
import { troubleshootTool, handleTroubleshoot } from './tools/troubleshoot.js';

/**
 * Nael Framework MCP Server
 * Provides documentation and examples for all framework packages
 */
export class NaelMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'nael-framework',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          listPackagesTool,
          getPackageDocsTool,
          searchApiTool,
          getExampleTool,
          getDecoratorInfoTool,
          getBestPracticesTool,
          troubleshootTool,
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list-packages':
            return await handleListPackages();
          
          case 'get-package-docs':
            return await handleGetPackageDocs(args as any);
          
          case 'search-api':
            return await handleSearchApi(args as any);
          
          case 'get-example':
            return await handleGetExample(args as any);
          
          case 'get-decorator-info':
            return await handleGetDecoratorInfo(args as any);
          
          case 'get-best-practices':
            return await handleGetBestPractices(args as any);
          
          case 'troubleshoot':
            return await handleTroubleshoot(args as any);
          
          default:
            return {
              content: [
                {
                  type: 'text',
                  text: `Unknown tool: ${name}`,
                },
              ],
              isError: true,
            };
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Log to stderr (stdout is used for MCP protocol)
    console.error('Nael Framework MCP Server running on stdio');
  }
}
