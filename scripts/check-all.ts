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
	'platform',
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

console.log('[check] All packages type-checked successfully.');
