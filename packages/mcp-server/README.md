# Nael MCP Server

The Nael MCP Server packages up the Nael Framework documentation, tooling examples, and guided prompts behind the [Model Context Protocol](https://modelcontextprotocol.io/) so that AI assistants can integrate directly with the platform. It supports multiple transports (stdio, Server-Sent Events, and a streamable HTTP API) and is published as `@nl-framework/mcp-server` on npm.

Latest builds now ship with the scheduler package documentation and examples, so MCP clients can explore cron/interval decorators, worker-backed execution, and the new `examples/scheduler` project without leaving their agent environment.

## Local development

```bash
bun install
bun run --cwd packages/mcp-server dev:sse
```

This launches the SSE transport on <http://localhost:3000> by default. Use `dev` for stdio mode or `dev:http` for the experimental streamable transport.

## Docker

A Bun-based Dockerfile lives alongside the package and performs a full install, build, and production prune in two stages. The resulting image ships only the compiled `dist/` output plus production dependencies and defaults to the SSE transport.

Build the image:

```bash
bun run --cwd packages/mcp-server docker:build
```

Run the container:

```bash
bun run --cwd packages/mcp-server docker:run
```

The container exposes port `3000`; override the port or transport at runtime with environment variables:

```bash
docker run --rm -e PORT=4000 -p 4000:4000 nl-framework/mcp-server
```

To switch transports, override the command:

```bash
docker run --rm -p 3000:3000 nl-framework/mcp-server bun dist/index.js
```

## Deployment notes

- The Dockerfile uses `oven/bun:latest` for both build and runtime stages, keeping everything on the latest Bun release.
- The build stage installs dependencies across the whole monorepo to compile TypeScript, then re-installs production dependencies scoped to `@nl-framework/mcp-server`.
- The runtime stage copies only the compiled output and the trimmed `node_modules`, yielding a compact image that is ready to deploy to any container runtime.
