import http from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createNaelMcpServer } from './server.js';
import { randomUUID } from 'node:crypto';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

async function createStreamableHttpServer() {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId: string) => {
      console.log(`[mcp-server] New session initialized: ${sessionId}`);
    },
    onsessionclosed: (sessionId: string) => {
      console.log(`[mcp-server] Session closed: ${sessionId}`);
    },
  });

  transport.onerror = (error: Error) => {
    console.error('[mcp-server] Streamable HTTP transport error:', error);
  };

  transport.onclose = () => {
    console.log('[mcp-server] Streamable HTTP transport closed');
  };

  const mcpServer = createNaelMcpServer();
  await mcpServer.connect(transport);

  const server = http.createServer(async (req, res) => {
    console.log('[mcp-server] Incoming request', {
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers.host,
        origin: req.headers.origin,
        sessionId: req.headers['x-mcp-session-id'],
      },
    });

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Mcp-Session-Id');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url!, `http://${req.headers.host}`);

    if ((req.method === 'POST' || req.method === 'GET') && url.pathname === '/mcp') {
      try {
        await transport.handleRequest(req, res);
        console.log('[mcp-server] Streamable HTTP request handled');
      } catch (error) {
        console.error('[mcp-server] Failed to handle streamable HTTP request:', error);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to handle request' }));
        }
      }
    } else if (req.method === 'GET' && url.pathname === '/') {
      // Serve a simple test page
      const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Nael MCP Server - Streamable HTTP</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        .endpoint { margin: 10px 0; }
    </style>
</head>
<body>
    <h1>Nael Framework MCP Server</h1>
    <h2>Streamable HTTP Transport (Remote Deployable)</h2>
    <p>Server is running and ready to accept streamable HTTP connections.</p>
    
    <div class="endpoint">
        <strong>MCP Endpoint:</strong> <code>POST /mcp</code>
    </div>
    
    <h3>Usage Example:</h3>
    <pre><code>// Initialize connection
const response = await fetch('/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    }
  })
});

// Call tools
const toolResponse = await fetch('/mcp', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-Mcp-Session-Id': sessionId
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list'
  })
});</code></pre>
    
    <h3>Features:</h3>
    <ul>
        <li>Session management with UUID-based session IDs</li>
        <li>Stateful connections with session persistence</li>
        <li>RESTful HTTP interface</li>
        <li>Compatible with standard HTTP clients</li>
    </ul>
</body>
</html>`;
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } else {
      console.warn('[mcp-server] Request not handled', {
        method: req.method,
        pathname: url.pathname,
      });
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  return server;
}

async function main() {
  try {
    const server = await createStreamableHttpServer();
    
    server.listen(PORT, () => {
      console.log(`[mcp-server] Streamable HTTP server listening on port ${PORT}`);
      console.log(`[mcp-server] MCP endpoint: http://localhost:${PORT}/mcp`);
      console.log(`[mcp-server] Test page: http://localhost:${PORT}/`);
    });

    process.on('SIGINT', () => {
      console.log('\n[mcp-server] Shutting down streamable HTTP server...');
      server.close(() => {
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('[mcp-server] Failed to start streamable HTTP server:', error);
    process.exit(1);
  }
}

void main();