FROM oven/bun:1.2.23 AS builder
WORKDIR /app

COPY tsconfig.base.json ./tsconfig.base.json
COPY packages/mcp-server/package.json ./packages/mcp-server/package.json
COPY packages/mcp-server/tsconfig.json ./packages/mcp-server/tsconfig.json
COPY packages/mcp-server/tsconfig.build.json ./packages/mcp-server/tsconfig.build.json
COPY packages/mcp-server/src ./packages/mcp-server/src

WORKDIR /app/packages/mcp-server
RUN bun install
RUN bun run build

FROM oven/bun:1.2.23 AS runner
WORKDIR /app/packages/mcp-server
ENV NODE_ENV=production

# Copy only what the binary needs
COPY --from=builder /app/packages/mcp-server/package.json ./package.json
COPY --from=builder /app/packages/mcp-server/bun.lock ./bun.lock
COPY --from=builder /app/packages/mcp-server/dist ./dist

# Install prod deps (Bun will respect NODE_ENV=production)
RUN bun install --production

ENV PORT=3333
EXPOSE 3333

CMD ["bun", "run", "dist/http-server.js"]