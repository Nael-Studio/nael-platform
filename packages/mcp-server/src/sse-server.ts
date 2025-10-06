import http from 'node:http';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createNaelMcpServer } from './server.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];

// Store active transports for message routing
const activeTransports = new Map<string, SSEServerTransport>();

async function createSSEServer() {
  const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Id');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url!, `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname === '/sse') {
      // SSE endpoint for receiving messages from server
      try {
        const transport = new SSEServerTransport('/message', res, {
          allowedOrigins: ALLOWED_ORIGINS,
          enableDnsRebindingProtection: false, // Disabled for development
        });

        const mcpServer = createNaelMcpServer();

        transport.onerror = (error: Error) => {
          console.error('[mcp-server] SSE transport error:', error);
        };

        transport.onclose = () => {
          console.log('[mcp-server] SSE transport closed');
          // Remove from active transports
          for (const [sessionId, t] of activeTransports.entries()) {
            if (t === transport) {
              activeTransports.delete(sessionId);
              break;
            }
          }
        };

        // Store transport for message routing
        const sessionId = req.headers['x-session-id'] as string || 'default';
        activeTransports.set(sessionId, transport);

        await mcpServer.connect(transport);
        console.log(`[mcp-server] SSE client connected from ${req.headers.origin || 'unknown'} (session: ${sessionId})`);
      } catch (error) {
        console.error('[mcp-server] Failed to connect SSE transport:', error);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end('Failed to establish SSE connection');
        }
      }
    } else if (req.method === 'POST' && url.pathname === '/message') {
      // Handle incoming JSON-RPC messages
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const message = JSON.parse(body);
          const sessionId = req.headers['x-session-id'] as string || 'default';
          
          // Find the appropriate transport
          const transport = activeTransports.get(sessionId);
          if (transport && transport.onmessage) {
            transport.onmessage(message);
            console.log('[mcp-server] Message routed to session %s:', sessionId, message.method);
          } else {
            console.warn(`[mcp-server] No active transport for session ${sessionId}`);
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          console.error('[mcp-server] Failed to parse message:', error);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    } else if (req.method === 'GET' && url.pathname === '/') {
      // Serve a simple test page
      const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Nael MCP Server - SSE Transport</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        .endpoint { margin: 10px 0; }
    </style>
</head>
<body>
    <h1>Nael Framework MCP Server</h1>
    <h2>SSE Transport (Remote Deployable)</h2>
    <p>Server is running and ready to accept SSE connections.</p>
    
    <div class="endpoint">
        <strong>SSE Endpoint:</strong> <code>GET /sse</code>
    </div>
    <div class="endpoint">
        <strong>Message Endpoint:</strong> <code>POST /message</code>
    </div>
    
    <h3>Usage Example:</h3>
    <pre><code>// Connect to SSE endpoint
const eventSource = new EventSource('/sse');

// Send messages via POST
fetch('/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  })
});</code></pre>
    
    <p><strong>Active Sessions:</strong> ${activeTransports.size}</p>
</body>
</html>`;
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  return server;
}

async function main() {
  try {
    const server = await createSSEServer();
    
    server.listen(PORT, () => {
      console.log(`[mcp-server] SSE server listening on port ${PORT}`);
      console.log(`[mcp-server] SSE endpoint: http://localhost:${PORT}/sse`);
      console.log(`[mcp-server] Message endpoint: http://localhost:${PORT}/message`);
      console.log(`[mcp-server] Test page: http://localhost:${PORT}/`);
    });

    process.on('SIGINT', () => {
      console.log('\n[mcp-server] Shutting down SSE server...');
      // Close all active transports
      for (const transport of activeTransports.values()) {
        if (transport.onclose) {
          transport.onclose();
        }
      }
      activeTransports.clear();
      
      server.close(() => {
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('[mcp-server] Failed to start SSE server:', error);
    process.exit(1);
  }
}

void main();