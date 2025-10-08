import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..', '..');
const packagesDir = path.join(workspaceRoot, 'packages');

const LOCAL_SCOPE = '@nl-framework/';

const dependencyFields = ['dependencies', 'optionalDependencies'] as const;

export interface PackageJson {
	name: string;
	version?: string;
	scripts?: Record<string, string>;
	private?: boolean;
	dependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	[section: string]: unknown;
}

export interface PublishablePackage {
	slug: string;
	name: string;
	dir: string;
	packageJson: PackageJson;
}

interface WorkspacePackage extends PublishablePackage {
	private: boolean;
	hasBuildScript: boolean;
	localDependencies: string[];
}

async function readPackageJson(filePath: string): Promise<PackageJson | null> {
	try {
		const fileStats = await stat(filePath);
		if (!fileStats.isFile()) {
			return null;
		}
	} catch {
		return null;
	}

	const raw = await readFile(filePath, 'utf8');
	return JSON.parse(raw) as PackageJson;
}

function extractLocalDependencies(pkg: PackageJson): string[] {
	const localDeps = new Set<string>();

	for (const field of dependencyFields) {
		const section = pkg[field];
		if (!section || typeof section !== 'object') {
			continue;
		}

		for (const dependencyName of Object.keys(section)) {
			if (!dependencyName.startsWith(LOCAL_SCOPE)) {
				continue;
			}

			localDeps.add(dependencyName.slice(LOCAL_SCOPE.length));
		}
	}

	return Array.from(localDeps);
}

async function discoverWorkspacePackages(): Promise<WorkspacePackage[]> {
	const entries = await readdir(packagesDir, { withFileTypes: true });
	const packages: WorkspacePackage[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue;
		}

		const slug = entry.name;
		const dir = path.join(packagesDir, slug);
		const packageJsonPath = path.join(dir, 'package.json');
		const packageJson = await readPackageJson(packageJsonPath);
		if (!packageJson) {
			continue;
		}

		const hasBuildScript = typeof packageJson.scripts?.build === 'string';

		packages.push({
			slug,
			name: packageJson.name,
			dir,
			packageJson,
			private: packageJson.private === true,
			hasBuildScript,
			localDependencies: extractLocalDependencies(packageJson)
		});
	}

	return packages;
}

function topoSortPublishable(packages: WorkspacePackage[]): PublishablePackage[] {
	const slugToPackage = new Map(packages.map((pkg) => [pkg.slug, pkg]));
	const publishableSlugs = new Set(
		packages.filter((pkg) => !pkg.private && pkg.hasBuildScript).map((pkg) => pkg.slug)
	);
	const visited = new Set<string>();
	const visiting = new Set<string>();
	const ordered: PublishablePackage[] = [];

	function visit(slug: string) {
		if (visited.has(slug)) {
			return;
		}

		if (visiting.has(slug)) {
			throw new Error(`Circular dependency detected while ordering workspace build targets: ${slug}`);
		}

		const pkg = slugToPackage.get(slug);
		if (!pkg) {
			return;
		}

		visiting.add(slug);
		for (const dep of pkg.localDependencies) {
			if (!publishableSlugs.has(dep)) {
				continue;
			}

			visit(dep);
		}
		visiting.delete(slug);
		visited.add(slug);
		ordered.push({
			slug: pkg.slug,
			name: pkg.name,
			dir: pkg.dir,
			packageJson: pkg.packageJson
		});
	}

	for (const slug of publishableSlugs) {
		visit(slug);
	}

	return ordered;
}

export async function loadPublishablePackages(): Promise<PublishablePackage[]> {
	const workspacePackages = await discoverWorkspacePackages();
	return topoSortPublishable(workspacePackages);
}

export async function loadPublishablePackageSlugs(): Promise<string[]> {
	const packages = await loadPublishablePackages();
	return packages.map((pkg) => pkg.slug);
}
