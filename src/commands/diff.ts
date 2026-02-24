import { Command } from 'commander';
import path from 'path';
import { diffSchemas } from '../core/diff';
import { SchemaValidationError } from '../core/errors';
import { fileExists, readJsonFile, readTextFile } from '../core/fs';
import { parseSchema } from '../core/parser';
import { getConfigPath, getProjectRoot } from '../core/paths';
import { loadState } from '../core/state-manager';
import { validateSchema } from '../core/validator';
import { generateSql, Provider, SqlConfig } from '../generator/sql-generator';
import { success } from '../utils/output';

interface DiffConfig {
  schemaFile: string;
  stateFile: string;
  provider?: string;
  sql?: SqlConfig;
}

const REQUIRED_CONFIG_FIELDS: Array<keyof DiffConfig> = ['schemaFile', 'stateFile'];

function resolveConfigPath(root: string, targetPath: string): string {
  return path.isAbsolute(targetPath) ? targetPath : path.join(root, targetPath);
}

export async function runDiff(): Promise<void> {
  const root = getProjectRoot();
  const configPath = getConfigPath(root);

  if (!(await fileExists(configPath))) {
    throw new Error('SchemaForge project not initialized. Run "schema-forge init" first.');
  }

  const config = await readJsonFile<DiffConfig>(configPath, {} as DiffConfig);

  for (const field of REQUIRED_CONFIG_FIELDS) {
    const value = config[field];
    if (!value || typeof value !== 'string') {
      throw new Error(`Invalid config: '${field}' is required`);
    }
  }

  const schemaPath = resolveConfigPath(root, config.schemaFile);
  const statePath = resolveConfigPath(root, config.stateFile);

  if (config.provider && config.provider !== 'postgres' && config.provider !== 'supabase') {
    throw new Error(`Unsupported provider '${config.provider}'.`);
  }

  const provider: Provider = (config.provider ?? 'postgres') as Provider;

  const schemaSource = await readTextFile(schemaPath);
  const schema = parseSchema(schemaSource);
  try {
    validateSchema(schema);
  } catch (error) {
    if (error instanceof Error) {
      throw new SchemaValidationError(error.message);
    }
    throw error;
  }

  const previousState = await loadState(statePath);
  const diff = diffSchemas(previousState, schema);

  if (diff.operations.length === 0) {
    success('No changes detected');
    return;
  }

  const sql = generateSql(diff, provider, config.sql);
  console.log(sql);
}

export function createDiffCommand(): Command {
  const command = new Command('diff');

  command.description('Compare two schema versions and generate migration SQL').action(async () => {
    await runDiff();
  });

  return command;
}
