import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ErrorCode,
  McpError,
  type CallToolResult,
  type GetPromptResult,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { ZodRawShape } from 'zod';
import { docs } from './docs';
import { exampleCatalog } from './docs/examples';
import { guides } from './docs/guides';
import { prompts } from './prompts';
import type { PromptTemplate } from './prompts/types';
import { resourceProviders } from './resources';
import type { ResourceProvider, ResourceResponse } from './resources/types';
import { tools } from './tools';
import type { McpTool, ToolResult, ToolHandlerArgs } from './tools/types';

interface PromptArgsSchemaResult {
  schema?: z.ZodObject<Record<string, z.ZodTypeAny>, 'strip'>;
  shape?: ZodRawShape;
  hasArguments: boolean;
}

export function createNaelMcpServer(): McpServer {
  const serverInfo = {
    name: '@nl-framework/mcp-server',
    version: '0.1.0',
    description: 'Model Context Protocol server for the Nael Framework.',
  } as const;

  const server = new McpServer(serverInfo);

  registerTools(server, tools);
  registerPrompts(server, prompts);
  registerResources(server, resourceProviders);

  return server;
}

function registerTools(server: McpServer, mcpTools: McpTool[]): void {
  for (const tool of mcpTools) {
    if (tool.inputSchema) {
      const toolInputSchema = tool.inputSchema;
      const inputShape = toolInputSchema.shape as ZodRawShape;
      server.registerTool(
        tool.name,
        {
          title: tool.name,
          description: tool.description,
          inputSchema: inputShape,
        },
        async (args: z.infer<typeof toolInputSchema>) => {
          const normalizedArgs = (args ?? {}) as ToolHandlerArgs<typeof toolInputSchema>;
          const result = await tool.handler(normalizedArgs);
          return toCallToolResult(result);
        },
      );
    } else {
      server.registerTool(
        tool.name,
        {
          title: tool.name,
          description: tool.description,
        },
        async () => {
          const result = await tool.handler({} as Record<string, unknown>);
          return toCallToolResult(result);
        },
      );
    }
  }
}

function toCallToolResult(result: ToolResult): CallToolResult {
  const content = result.content.map((block) => ({
    type: block.type,
    text: block.text,
    ...(block._meta ? { _meta: block._meta } : {}),
  })) as CallToolResult['content'];

  const callResult: CallToolResult = {
    content,
  };

  if (typeof result.structuredContent !== 'undefined') {
    // Use a zod schema to validate structuredContent at runtime
    // Assuming structuredContent is an object or array; adjust schema as needed
    const structuredContentSchema = z.any(); // Replace with a more specific schema if available
    if (structuredContentSchema.safeParse(result.structuredContent).success) {
      callResult.structuredContent = result.structuredContent;
    } else {
      // Optionally, handle invalid structuredContent (e.g., log or throw)
    }
  }

  if (typeof result.isError !== 'undefined') {
    callResult.isError = result.isError;
  }

  if (result.metadata) {
    callResult._meta = result.metadata as NonNullable<CallToolResult['_meta']>;
  }

  return callResult;
}

function registerPrompts(server: McpServer, promptTemplates: PromptTemplate[]): void {
  for (const prompt of promptTemplates) {
    const { schema, shape, hasArguments } = buildPromptSchema(prompt);

    if (hasArguments && schema && shape) {
      server.registerPrompt(
        prompt.name,
        {
          description: prompt.description,
          argsSchema: shape,
        },
        async (args: Record<string, string | undefined>) =>
          buildPromptResult(prompt, args ?? {}),
      );
    } else {
      server.registerPrompt(
        prompt.name,
        { description: prompt.description },
        async () => buildPromptResult(prompt, {}),
      );
    }
  }
}

function buildPromptSchema(prompt: PromptTemplate): PromptArgsSchemaResult {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const arg of prompt.arguments) {
    const schema = z
      .string()
      .describe(arg.description)
      .transform((value) => value.trim());
    shape[arg.name] = arg.required ? schema : schema.optional();
  }

  const hasArguments = Object.keys(shape).length > 0;
  const schema = hasArguments ? z.object(shape) : undefined;
  return {
    schema,
    shape: schema?.shape as ZodRawShape | undefined,
    hasArguments,
  };
}

function buildPromptResult(
  prompt: PromptTemplate,
  args: Record<string, string | undefined>,
): GetPromptResult {
  const normalizedArgs = Object.fromEntries(
    Object.entries(args).map(([key, value]) => [key, value ?? '']),
  ) as Record<string, string>;

  const promptText = prompt.build(normalizedArgs);
  return {
    description: prompt.description,
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: promptText,
        },
      },
    ],
  } satisfies GetPromptResult;
}

function registerResources(server: McpServer, providers: ResourceProvider[]): void {
  registerDocumentationResources(server, providers);
  registerExampleResources(server, providers);
  registerGuideResources(server, providers);
  registerApiResources(server, providers);
}

function registerDocumentationResources(server: McpServer, providers: ResourceProvider[]): void {
  for (const key of docs.packageKeys) {
    const uri = `nael://docs/${key}`;
    const doc = docs.packages[key as keyof typeof docs.packages];
    if (!doc) continue;
    server.registerResource(
      `docs-${key}`,
      uri,
      {
        title: doc.name,
        description: doc.description,
      },
      async () => readResourceOrThrow(providers, uri),
    );
  }
}

function registerExampleResources(server: McpServer, providers: ResourceProvider[]): void {
  const uniqueCategories = new Set(exampleCatalog.map((example) => example.category));
  const uniqueIds = new Set(exampleCatalog.map((example) => example.id));

  server.registerResource(
    'examples-all',
    'nael://examples/all',
    {
      title: 'All Examples',
      description: 'Every example bundled with the Nael Framework.',
    },
    async () => readResourceOrThrow(providers, 'nael://examples/all'),
  );

  for (const id of uniqueIds) {
    const uri = `nael://examples/${id}`;
    server.registerResource(
      `examples-${id}`,
      uri,
      {
        title: `Example ${id}`,
      },
      async () => readResourceOrThrow(providers, uri),
    );
  }

  for (const category of uniqueCategories) {
    const uri = `nael://examples/${category}`;
    server.registerResource(
      `examples-category-${category}`,
      uri,
      {
        title: `Examples: ${category}`,
      },
      async () => readResourceOrThrow(providers, uri),
    );
  }
}

function registerGuideResources(server: McpServer, providers: ResourceProvider[]): void {
  server.registerResource(
    'guides-all',
    'nael://guides/all',
    {
      title: 'All Guides',
      description: 'Framework-wide implementation guides and walkthroughs.',
    },
    async () => readResourceOrThrow(providers, 'nael://guides/all'),
  );

  for (const guide of guides) {
    const uri = `nael://guides/${guide.id}`;
    server.registerResource(
      `guide-${guide.id}`,
      uri,
      {
        title: guide.title,
        description: guide.summary,
      },
      async () => readResourceOrThrow(providers, uri),
    );
  }
}

function registerApiResources(server: McpServer, providers: ResourceProvider[]): void {
  const sections: Array<['decorators' | 'classes' | 'interfaces', string]> = [
    ['decorators', 'Decorator Reference'],
    ['classes', 'Class Reference'],
    ['interfaces', 'Interface Reference'],
  ];

  for (const [section, title] of sections) {
    const uri = `nael://api/${section}`;
    server.registerResource(
      `api-${section}`,
      uri,
      {
        title,
        description: `Nael Framework ${section} details and signatures.`,
      },
      async () => readResourceOrThrow(providers, uri),
    );
  }
}

async function readResourceOrThrow(providers: ResourceProvider[], uri: string) {
  const resolved = await resolveResource(providers, uri);

  if (!resolved) {
    throw new McpError(ErrorCode.InvalidParams, `Resource ${uri} not found.`);
  }

  return formatResourceContents(resolved);
}

async function resolveResource(
  providers: ResourceProvider[],
  uri: string,
): Promise<ResourceResponse | undefined> {
  for (const provider of providers) {
    for (const pattern of provider.patterns) {
      if (!pattern.test(uri)) continue;
      const result = await provider.resolve({ uri });
      if (result) {
        return result;
      }
    }
  }
  return undefined;
}

function formatResourceContents(resolved: ResourceResponse) {
  const text =
    typeof resolved.data === 'string'
      ? resolved.data
      : JSON.stringify(resolved.data, null, 2);

  return {
    contents: [
      {
        uri: resolved.uri,
        mimeType: resolved.mimeType,
        text,
      },
    ],
  };
}
