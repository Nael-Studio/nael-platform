import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { parse } from 'yaml';
import { deepMerge, type PlainObject } from '../utils/deep-merge';

export interface ConfigLoadOptions {
  dir?: string;
  env?: string;
  files?: string[];
  overrides?: PlainObject;
}

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const loadYamlFile = async (path: string): Promise<PlainObject> => {
  const file = await readFile(path, 'utf-8');
  const parsed = parse(file);
  return (parsed ?? {}) as PlainObject;
};

export class ConfigLoader {
  static async load(options: ConfigLoadOptions = {}): Promise<PlainObject> {
    const dir = resolvePath(process.cwd(), options.dir ?? 'config');
    let config: PlainObject = {};

    const filesToLoad: string[] = [];
    filesToLoad.push('default.yaml');

    if (options.files?.length) {
      filesToLoad.push(...options.files);
    } else {
      const env = options.env ?? process.env.APP_ENV ?? process.env.NODE_ENV;
      if (env) {
        filesToLoad.push(`${env}.yaml`);
      }
      filesToLoad.push('env.yaml');
    }

    for (const fileName of filesToLoad) {
      const fullPath = resolvePath(dir, fileName);
      if (!(await fileExists(fullPath))) {
        continue;
      }
      const fileConfig = await loadYamlFile(fullPath);
      config = deepMerge(config, fileConfig);
    }

    if (options.overrides) {
      config = deepMerge(config, options.overrides);
    }

    return config;
  }
}
