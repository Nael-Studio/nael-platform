declare module '@modelcontextprotocol/sdk/server/mcp.js' {
  export { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp';
}

declare module '@modelcontextprotocol/sdk/server/stdio.js' {
  export { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
}

declare module '@modelcontextprotocol/sdk/types.js' {
  export {
    ErrorCode,
    McpError,
    type CallToolResult,
    type GetPromptResult,
  } from '@modelcontextprotocol/sdk/types';
}
