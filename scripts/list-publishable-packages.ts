#!/usr/bin/env bun

import { loadPublishablePackages, loadPublishablePackageSlugs } from './utils/publishable-packages';

const args = new Set(Bun.argv.slice(2));

if (args.has('--json')) {
	const packages = await loadPublishablePackages();
	const payload = packages.map((pkg) => ({
		slug: pkg.slug,
		name: pkg.name,
		path: pkg.dir
	}));

	console.log(JSON.stringify(payload, null, 2));
} else {
	const slugs = await loadPublishablePackageSlugs();
	for (const slug of slugs) {
		console.log(slug);
	}
}
