#!/usr/bin/env bun

import { $ } from 'bun';

import { loadPublishablePackages } from './utils/publishable-packages';

const packages = await loadPublishablePackages();

if (packages.length === 0) {
	console.warn('[build] No publishable packages with build scripts were discovered.');
} else {
	for (const pkg of packages) {
		console.log(`[build] Building ${pkg.name}...`);
		await $`bun run --cwd ${pkg.dir} build`;
	}

	console.log('[build] All packages built successfully.');
}
