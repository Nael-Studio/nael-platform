#!/usr/bin/env bun

import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dependencyFields = [
	'dependencies',
	'devDependencies',
	'peerDependencies',
	'optionalDependencies',
	'bundledDependencies',
	'bundleDependencies'
] as const;

const CLI_PACKAGE_NAME = '@nl-framework/cli';

type DependencySection = (typeof dependencyFields)[number];

type PackageJson = {
	name: string;
	version: string;
	config?: Record<string, unknown>;
	[section: string]: unknown;
};

type BumpType = 'major' | 'minor' | 'patch';

const bumpTypes: BumpType[] = ['major', 'minor', 'patch'];

function parseArgs(): { bumpType: BumpType; dryRun: boolean } {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		throw new Error('Missing version bump type. Usage: bun run scripts/bump-version.ts <major|minor|patch> [--dry-run]');
	}

	let bumpType: BumpType | undefined;
	let dryRun = false;

	for (const arg of args) {
		if (arg === '--dry-run' || arg === '-d') {
			dryRun = true;
			continue;
		}

		if (bumpTypes.includes(arg as BumpType)) {
			bumpType = arg as BumpType;
			continue;
		}

		throw new Error(`Unknown argument: ${arg}`);
	}

	if (!bumpType) {
		throw new Error('Missing version bump type. Usage: bun run scripts/bump-version.ts <major|minor|patch> [--dry-run]');
	}

	return { bumpType, dryRun };
}

function bumpVersion(version: string, bumpType: BumpType): string {
	const match = version.match(/^(\d+)\.(\d+)\.(\d+)(-.+)?$/);
	if (!match) {
		throw new Error(`Unsupported version format: ${version}`);
	}

	const majorStr = match[1];
	const minorStr = match[2];
	const patchStr = match[3];

	if (!majorStr || !minorStr || !patchStr) {
		throw new Error(`Failed to capture semantic version parts from ${version}`);
	}

	const majorInitial = Number.parseInt(majorStr, 10);
	const minorInitial = Number.parseInt(minorStr, 10);
	const patchInitial = Number.parseInt(patchStr, 10);

	if (Number.isNaN(majorInitial) || Number.isNaN(minorInitial) || Number.isNaN(patchInitial)) {
		throw new Error(`Unable to parse numeric parts from version: ${version}`);
	}

	let major = majorInitial;
	let minor = minorInitial;
	let patch = patchInitial;

	switch (bumpType) {
		case 'major':
			major += 1;
			minor = 0;
			patch = 0;
			break;
		case 'minor':
			minor += 1;
			patch = 0;
			break;
		case 'patch':
			patch += 1;
			break;
	}

	return `${major}.${minor}.${patch}`;
}

function deriveRange(currentRange: string, version: string): string {
	if (currentRange.startsWith('workspace:')) {
		return `^${version}`;
	}

	if (currentRange === '' || currentRange === '*') {
		return `^${version}`;
	}

	const comparatorMatch = currentRange.match(/^(>=|<=|>|<|=)/);
	if (comparatorMatch) {
		return `${comparatorMatch[1]}${version}`;
	}

	const prefix = currentRange.charAt(0);
	if (prefix === '^' || prefix === '~') {
		return `${prefix}${version}`;
	}

	if (/^\d/.test(currentRange)) {
		return version;
	}

	console.warn(`Unable to determine range style for "${currentRange}". Defaulting to ^${version}.`);
	return `^${version}`;
}

async function readPackageJson(filePath: string): Promise<PackageJson> {
	const raw = await readFile(filePath, 'utf8');
	return JSON.parse(raw) as PackageJson;
}

async function writePackageJson(filePath: string, json: PackageJson, dryRun: boolean): Promise<void> {
	if (dryRun) {
		return;
	}

	const serialized = `${JSON.stringify(json, null, 2)}\n`;
	await writeFile(filePath, serialized, 'utf8');
}

async function collectWorkspacePackages(packagesDir: string): Promise<{ path: string; json: PackageJson }[]> {
	const entries = await readdir(packagesDir, { withFileTypes: true });
	const packages: { path: string; json: PackageJson }[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;

		const packageJsonPath = path.join(packagesDir, entry.name, 'package.json');
		try {
			const stats = await stat(packageJsonPath);
			if (!stats.isFile()) continue;
		} catch {
			continue;
		}

		const json = await readPackageJson(packageJsonPath);
		packages.push({ path: packageJsonPath, json });
	}

	return packages;
}


function updateDependencySections(pkg: PackageJson, affectedPackages: Set<string>, nextVersion: string): void {
	for (const field of dependencyFields) {
		const section = pkg[field] as Record<string, string> | undefined;
		if (!section) continue;

		for (const depName of Object.keys(section)) {
			if (!affectedPackages.has(depName)) continue;
			const currentRange = section[depName];
			if (!currentRange) continue;
			section[depName] = deriveRange(currentRange, nextVersion);
		}
	}
}

function updateCliFrameworkVersion(pkg: PackageJson, nextVersion: string): void {
	if (pkg.name !== CLI_PACKAGE_NAME) {
		return;
	}

	const config = (pkg.config ?? {}) as Record<string, unknown>;
	const currentRange = typeof config.frameworkVersion === 'string' ? config.frameworkVersion : `^${nextVersion}`;
	config.frameworkVersion = deriveRange(currentRange, nextVersion);
	pkg.config = config;
}

async function main() {
	const { bumpType, dryRun } = parseArgs();
	const rootDir = path.resolve(import.meta.dir, '..');
	const rootPackagePath = path.join(rootDir, 'package.json');
	const packagesDir = path.join(rootDir, 'packages');

	const rootPackage = await readPackageJson(rootPackagePath);
	const currentVersion = rootPackage.version;

	if (!currentVersion) {
		throw new Error('Root package.json is missing a "version" field.');
	}

	const nextVersion = bumpVersion(currentVersion, bumpType);
	const workspacePackages = await collectWorkspacePackages(packagesDir);
	const packageNames = new Set(workspacePackages.map(({ json }) => json.name));

	console.log(`Bumping ${workspacePackages.length} package(s) from ${currentVersion} -> ${nextVersion}${dryRun ? ' (dry run)' : ''}.`);

	rootPackage.version = nextVersion;

	for (const { json } of workspacePackages) {
		json.version = nextVersion;
		updateDependencySections(json, packageNames, nextVersion);
		updateCliFrameworkVersion(json, nextVersion);
	}

	if (dryRun) {
		console.log('Dry run complete. No files were written.');
		for (const { path: packagePath, json } of workspacePackages) {
			console.log(`- ${json.name} (${packagePath})`);
		}
		return;
	}

	await writePackageJson(rootPackagePath, rootPackage, dryRun);

	for (const { path: packagePath, json } of workspacePackages) {
		await writePackageJson(packagePath, json, dryRun);
		console.log(`Updated ${json.name}`);
	}

	console.log('Version bump completed successfully.');
}

await main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
