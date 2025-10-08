#!/usr/bin/env bun

import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dir, '..');
const packagesDir = path.join(rootDir, 'packages');

const dependencyFields = [
	'dependencies',
	'devDependencies',
	'peerDependencies',
	'optionalDependencies',
	'bundledDependencies',
	'bundleDependencies'
] as const;

type PackageJson = {
	name: string;
	version: string;
	config?: Record<string, unknown>;
	packageManager?: string;
	[section: string]: unknown;
};

type DependencySections = (typeof dependencyFields)[number];

type VersionMap = Map<string, string>;

async function collectWorkspaceVersions(): Promise<VersionMap> {
	const versions: VersionMap = new Map();
	const entries = await readdir(packagesDir, { withFileTypes: true });

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;

		const pkgJsonPath = path.join(packagesDir, entry.name, 'package.json');
		try {
			const stats = await stat(pkgJsonPath);
			if (!stats.isFile()) continue;
		} catch {
			continue;
		}

		const raw = await readFile(pkgJsonPath, 'utf8');
		const pkg = JSON.parse(raw) as PackageJson;
		versions.set(pkg.name, pkg.version);
	}

	return versions;
}

function resolveWorkspaceRange(range: string, version: string): string {
	const spec = range.slice('workspace:'.length).trim();

	if (spec === '' || spec === '*' || spec === '^') {
		return `^${version}`;
	}

	if (spec === '~') {
		return `~${version}`;
	}

	if (/^(>=|<=|>|<|=)/.test(spec)) {
		return `${spec}${version}`;
	}

	if (/^[0-9]/.test(spec)) {
		return spec;
	}

	console.warn(`Unknown workspace specifier "${range}". Falling back to ^${version}.`);
	return `^${version}`;
}

function updateDependencies(pkg: PackageJson, versions: VersionMap): boolean {
	let mutated = false;

	for (const field of dependencyFields) {
		const section = pkg[field] as Record<string, string> | undefined;
		if (!section) continue;

		for (const [dep, currentRange] of Object.entries(section)) {
			if (!currentRange.startsWith('workspace:')) continue;

			const depVersion = versions.get(dep);
			if (!depVersion) {
				throw new Error(`Workspace dependency ${dep} referenced but no local version found.`);
			}

			const resolved = resolveWorkspaceRange(currentRange, depVersion);
			if (resolved !== currentRange) {
				section[dep] = resolved;
				mutated = true;
			}
		}
	}

	return mutated;
}

async function readRootPackageJson(): Promise<PackageJson> {
	const raw = await readFile(path.join(rootDir, 'package.json'), 'utf8');
	return JSON.parse(raw) as PackageJson;
}

function extractBunVersion(packageManager: string | undefined): string | null {
	if (!packageManager) {
		return null;
	}

	const match = /^bun@(.+)$/.exec(packageManager.trim());
	return match?.[1] ?? null;
}

async function main() {
	const versions = await collectWorkspaceVersions();
	const entries = await readdir(packagesDir, { withFileTypes: true });
	let updated = 0;
	const rootPackageJson = await readRootPackageJson();
	const coreVersion = versions.get('@nl-framework/core');
	const desiredFrameworkRange = coreVersion ? `^${coreVersion}` : null;
	const desiredBunVersion = extractBunVersion(rootPackageJson.packageManager);

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		const pkgDir = path.join(packagesDir, entry.name);
		const pkgJsonPath = path.join(pkgDir, 'package.json');

		try {
			const stats = await stat(pkgJsonPath);
			if (!stats.isFile()) continue;
		} catch {
			continue;
		}

		const raw = await readFile(pkgJsonPath, 'utf8');
		const pkg = JSON.parse(raw) as PackageJson;

		let mutated = updateDependencies(pkg, versions);

		if (pkg.name === '@nl-framework/cli') {
			if (pkg.config && typeof pkg.config === 'object') {
				const config = pkg.config as Record<string, unknown>;
				const currentFrameworkVersion = config['frameworkVersion'] as string | undefined;
				const currentBunVersion = config['bunVersion'] as string | undefined;

				if (desiredFrameworkRange && currentFrameworkVersion !== desiredFrameworkRange) {
					config['frameworkVersion'] = desiredFrameworkRange;
					mutated = true;
				}

				if (desiredBunVersion && currentBunVersion !== desiredBunVersion) {
					config['bunVersion'] = desiredBunVersion;
					mutated = true;
				}
			} else if (desiredFrameworkRange) {
				const nextConfig: Record<string, unknown> = {
					frameworkVersion: desiredFrameworkRange
				};

				if (desiredBunVersion) {
					nextConfig['bunVersion'] = desiredBunVersion;
				}

				pkg.config = nextConfig;
				mutated = true;
			}
		}

		if (!mutated) {
			continue;
		}

		const serialized = `${JSON.stringify(pkg, null, 2)}\n`;
		await writeFile(pkgJsonPath, serialized, 'utf8');
		updated += 1;
		console.log(`Updated ${pkg.name}`);
	}

	if (updated === 0) {
		console.log('No workspace ranges needed updating.');
	} else {
		console.log(`Finished updating ${updated} package(s).`);
	}
}

await main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
