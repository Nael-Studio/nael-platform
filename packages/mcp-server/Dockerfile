# syntax=docker/dockerfile:1.7

FROM oven/bun:latest AS builder

WORKDIR /app

# Copy repository source
COPY . .

# Install dependencies and build the MCP server
RUN bun install --frozen-lockfile \
  && bun run --cwd packages/mcp-server build \
  && bun install --cwd packages/mcp-server --frozen-lockfile --production

FROM oven/bun:latest AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy the compiled application and production dependencies
COPY --from=builder /app/packages/mcp-server/dist ./dist
COPY --from=builder /app/packages/mcp-server/package.json ./package.json
COPY --from=builder /app/packages/mcp-server/node_modules ./node_modules

EXPOSE 3000

# Default to the SSE server; override with another entrypoint if needed
CMD ["bun", "dist/sse-server.js"]
