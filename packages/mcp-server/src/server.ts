import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { listPackagesTool, handleListPackages } from './tools/list-packages.js';
import { getPackageDocsTool, handleGetPackageDocs } from './tools/get-package-docs.js';
import { searchApiTool, handleSearchApi } from './tools/search-api.js';
import { getExampleTool, handleGetExample } from './tools/get-example.js';
import { getDecoratorInfoTool, handleGetDecoratorInfo } from './tools/get-decorator-info.js';
import { getBestPracticesTool, handleGetBestPractices } from './tools/get-best-practices.js';
import { troubleshootTool, handleTroubleshoot } from './tools/troubleshoot.js';
import {
  createHttpControllerPrompt,
  handleCreateHttpController,
  createGraphqlResolverPrompt,
  handleCreateGraphqlResolver,
  setupMicroservicePrompt,
  handleSetupMicroservice,
  setupAuthPrompt,
  handleSetupAuth,
} from './prompts/index.js';
import { resources, handleResourceRead } from './resources/index.js';

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
          tools: {
            list: true,
            call: true,
          },
          prompts: {
            list: true,
            call: true,
          },
          resources: {
            list: true,
            read: true,
          },
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

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          createHttpControllerPrompt,
          createGraphqlResolverPrompt,
          setupMicroservicePrompt,
          setupAuthPrompt,
        ],
      };
    });

    // Handle prompt requests
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create-http-controller':
            return await handleCreateHttpController(args || {});
          
          case 'create-graphql-resolver':
            return await handleCreateGraphqlResolver(args || {});
          
          case 'setup-microservice':
            return await handleSetupMicroservice(args || {});
          
          case 'setup-auth':
            return await handleSetupAuth(args || {});
          
          default:
            return {
              messages: [
                {
                  role: 'assistant',
                  content: {
                    type: 'text',
                    text: `Unknown prompt: ${name}`,
                  },
                },
              ],
            };
        }
      } catch (error) {
        return {
          messages: [
            {
              role: 'assistant',
              content: {
                type: 'text',
                text: `Error executing prompt ${name}: ${error instanceof Error ? error.message : String(error)}`,
              },
            },
          ],
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources
      };
    });

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        return await handleResourceRead(uri);
      } catch (error) {
        throw new Error(`Error reading resource ${uri}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  async connect(transport: Transport) {
    await this.server.connect(transport);
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.connect(transport);
    
    // Log to stderr (stdout is used for MCP protocol)
    console.error('Nael Framework MCP Server running on stdio');
  }
}

if (import.meta.main) {
  const server = new NaelMCPServer();
  server.run().catch((error) => {
    console.error('Fatal error in MCP server:', error);
    process.exit(1);
  });
}
