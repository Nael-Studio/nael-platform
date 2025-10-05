#!/usr/bin/env bun

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { NaelMCPServer } from './server.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { DEFAULT_NEGOTIATED_PROTOCOL_VERSION, isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

const DEFAULT_PORT = 3333;

const port = Number.parseInt(process.env.PORT ?? `${DEFAULT_PORT}`, 10);

if (Number.isNaN(port)) {
  console.error(`Invalid PORT value: ${process.env.PORT}`);
  process.exit(1);
}

function parseList(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const parts = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts : undefined;
}

const allowedHosts = parseList(process.env.MCP_ALLOWED_HOSTS);
const allowedOriginsConfig = parseList(process.env.MCP_ALLOWED_ORIGINS);
const enableDnsProtection = process.env.MCP_ENABLE_DNS_PROTECTION === 'true';

type SessionEntry = {
  transport: StreamableHTTPServerTransport | SSEServerTransport;
  server: NaelMCPServer;
};

const sessions = new Map<string, SessionEntry>();

function normalizeInitializeBody(body: unknown) {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const request = body as Record<string, any>;

  if (request.method !== 'initialize') {
    return null;
  }

  const params = (typeof request.params === 'object' && request.params) || {};
  const clientInfo = (typeof params.clientInfo === 'object' && params.clientInfo) || {};

  return {
    jsonrpc: typeof request.jsonrpc === 'string' ? request.jsonrpc : '2.0',
    id: request.id,
    method: 'initialize',
    params: {
      protocolVersion: typeof params.protocolVersion === 'string'
        ? params.protocolVersion
        : DEFAULT_NEGOTIATED_PROTOCOL_VERSION,
      capabilities: params.capabilities ?? {},
      clientInfo: {
        name: typeof clientInfo.name === 'string' ? clientInfo.name : 'unknown-client',
        version: typeof clientInfo.version === 'string' ? clientInfo.version : '0.0.0',
        ...clientInfo,
      },
      ...params,
    },
  };
}

function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', process.env.MCP_ALLOWED_ORIGIN ?? '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    if (chunk) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();

  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse JSON body:', error);
    throw error;
  }
}

function getHeaderValue(header: string | string[] | undefined): string | undefined {
  if (!header) {
    return undefined;
  }

  return Array.isArray(header) ? header[0] : header;
}

async function handleStreamableHttp(
  req: IncomingMessage,
  res: ServerResponse,
  parsedBody: unknown
) {
  const sessionHeader = getHeaderValue(req.headers['mcp-session-id']);

  const existingEntry = sessionHeader ? sessions.get(sessionHeader) : undefined;

  if (sessionHeader && !existingEntry) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32004,
          message: 'Session not found',
        },
        id: null,
      })
    );
    return;
  }

  if (existingEntry) {
    if (!(existingEntry.transport instanceof StreamableHTTPServerTransport)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Session is using a different transport protocol',
          },
          id: null,
        })
      );
      return;
    }

    try {
      await existingEntry.transport.handleRequest(req as any, res, parsedBody);
    } catch (error) {
      console.error('Error handling streamable HTTP request:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          })
        );
      }
    }
    return;
  }

  const normalizedInitialize = normalizeInitializeBody(parsedBody);

  if (req.method === 'POST' && normalizedInitialize && isInitializeRequest(normalizedInitialize)) {
    const naelServer = new NaelMCPServer();

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        sessions.set(sessionId, { transport, server: naelServer });
      },
      onsessionclosed: (sessionId) => {
        sessions.delete(sessionId);
      },
      allowedHosts,
      allowedOrigins: allowedOriginsConfig,
      enableDnsRebindingProtection: enableDnsProtection,
    });

    transport.onclose = () => {
      const { sessionId } = transport;
      if (sessionId) {
        sessions.delete(sessionId);
      }
    };

    try {
      await naelServer.connect(transport);
      await transport.handleRequest(req as any, res, normalizedInitialize);
    } catch (error) {
      console.error('Error initializing streamable HTTP session:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Failed to initialize session',
            },
            id: null,
          })
        );
      }
    }
    return;
  }

  res.writeHead(400, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Missing or invalid session. Initialize with POST /mcp first.',
      },
      id: null,
    })
  );
}

async function handleSseConnection(req: IncomingMessage, res: ServerResponse) {
  const transport = new SSEServerTransport('/messages', res, {
    allowedHosts,
    allowedOrigins: allowedOriginsConfig,
    enableDnsRebindingProtection: enableDnsProtection,
  });
  const naelServer = new NaelMCPServer();

  const sessionId = transport.sessionId;
  sessions.set(sessionId, { transport, server: naelServer });

  transport.onclose = () => {
    sessions.delete(sessionId);
  };

  res.on('close', () => {
    sessions.delete(sessionId);
  });

  try {
    await naelServer.connect(transport);
  } catch (error) {
    console.error('Error establishing SSE session:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Failed to establish SSE session');
    }
  }
}

async function handleSsePost(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  parsedBody: unknown
) {
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Missing sessionId query parameter',
        },
        id: null,
      })
    );
    return;
  }

  const entry = sessions.get(sessionId);

  if (!entry || !(entry.transport instanceof SSEServerTransport)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32004,
          message: 'SSE session not found',
        },
        id: null,
      })
    );
    return;
  }

  try {
    await entry.transport.handlePostMessage(req as any, res, parsedBody);
  } catch (error) {
    console.error('Error handling SSE POST message:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Failed to process request',
          },
          id: null,
        })
      );
    }
  }
}

const server = createServer(async (req, res) => {
  setCorsHeaders(res);

  if (!req.url) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Invalid request');
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  try {
    if (url.pathname === '/mcp') {
      const body = req.method === 'POST' || req.method === 'DELETE' ? await readJsonBody(req) : undefined;
      await handleStreamableHttp(req, res, body);
      return;
    }

    if (url.pathname === '/sse') {
      if (req.method !== 'GET') {
        res.writeHead(405, { 'Allow': 'GET' });
        res.end('Method Not Allowed');
        return;
      }

      await handleSseConnection(req, res);
      return;
    }

    if (url.pathname === '/messages') {
      if (req.method !== 'POST') {
        res.writeHead(405, { 'Allow': 'POST' });
        res.end('Method Not Allowed');
        return;
      }

      const body = await readJsonBody(req);
      await handleSsePost(req, res, url, body);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  } catch (error) {
    console.error('Unhandled error processing request:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  }
});

server.listen(port, () => {
  console.log(`Nael MCP HTTP server listening on http://0.0.0.0:${port}`);
  console.log('Endpoints:');
  console.log('  POST/GET/DELETE /mcp   (Streamable HTTP transport)');
  console.log('  GET /sse               (Deprecated SSE stream)');
  console.log('  POST /messages         (Deprecated SSE message endpoint)');
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT. Closing sessions...');

  for (const [sessionId, { transport }] of sessions.entries()) {
    try {
      await transport.close();
    } catch (error) {
      console.error(`Error closing session ${sessionId}:`, error);
    }
  }

  server.close(() => {
    console.log('HTTP server shut down.');
    process.exit(0);
  });
});
