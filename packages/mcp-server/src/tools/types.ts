import type { AnyZodObject, z } from 'zod';

export type ToolContent = {
  type: 'text';
  text: string;
  _meta?: Record<string, unknown>;
};

export interface ToolResult {
  content: ToolContent[];
  structuredContent?: unknown;
  isError?: boolean;
  metadata?: Record<string, unknown>;
}

export type ToolHandlerArgs<TSchema extends AnyZodObject = z.ZodObject<any>> = z.infer<TSchema>;


export interface McpTool<TSchema extends AnyZodObject = z.ZodObject<any>> {
  name: string;
  description: string;
  inputSchema?: TSchema;
  handler: (args: ToolHandlerArgs<TSchema>) => Promise<ToolResult>;
}

export function asTextContent(message: string): ToolContent {
  return {
    type: 'text',
    text: message,
  };
}

export function formatList(items: string[]): string {
  return items.join('\n');
}
