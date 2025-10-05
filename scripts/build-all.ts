#!/usr/bin/env bun

import { $ } from 'bun';

const packages = ['logger', 'core', 'config', 'http', 'graphql', 'orm', 'auth', 'microservices', 'mcp-server', 'platform'] as const;

for (const pkg of packages) {
	console.log(`[build] Building @nl-framework/${pkg}...`);
	await $`bun run --cwd packages/${pkg} build`;
}

console.log('[build] All packages built successfully.');
