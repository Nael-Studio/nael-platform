#!/usr/bin/env bun

import { $ } from 'bun';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const packages = [
	'core',
	'config',
	'logger',
	'orm',
	'http',
	'graphql',
	'auth',
	'microservices',
	'mcp-server',
	'platform',
	'cli',
] as const;

const examples = [
	'basic-http',
	'basic-graphql',
	'federated-graphql',
	'federation-gateway',
	'mongo-orm',
	'auth-http',
	'auth-graphql',
	'microservices',
] as const;

const getTsconfig = (pkg: (typeof packages)[number]): string => {
	const buildPath = join('packages', pkg, 'tsconfig.build.json');
	if (existsSync(buildPath)) {
		return buildPath;
	}

	return join('packages', pkg, 'tsconfig.json');
};

for (const pkg of packages) {
	const tsconfigPath = getTsconfig(pkg);

	console.log(`[check] Type-checking @nl-framework/${pkg} using ${tsconfigPath}...`);

	await $`bunx tsc --build --pretty false --force ${tsconfigPath}`;
}

for (const example of examples) {
	console.log(`[check] Type-checking example ${example}...`);
	await $`bun run --cwd examples/${example} check`;
}

console.log('[check] All packages and examples type-checked successfully.');
