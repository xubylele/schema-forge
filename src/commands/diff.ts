import { Command } from 'commander';
import path from 'path';
import { fileExists, readJsonFile, readTextFile } from '../core/fs';
import { getConfigPath, getProjectRoot } from '../core/paths';
import { resolveProvider } from '../core/provider';
import {
  createSchemaValidationError,
  diffSchemas,
  generateSql,
  loadState,
  parseSchema,
  validateSchema,
  type SqlConfig
} from '../domain';
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

  const { provider } = resolveProvider(config.provider);

  const schemaSource = await readTextFile(schemaPath);
  const schema = await parseSchema(schemaSource);
  try {
    await validateSchema(schema);
  } catch (error) {
    if (error instanceof Error) {
      throw await createSchemaValidationError(error.message);
    }
    throw error;
  }

  const previousState = await loadState(statePath);
  const diff = await diffSchemas(previousState, schema);

  if (diff.operations.length === 0) {
    success('No changes detected');
    return;
  }

  const sql = await generateSql(diff, provider, config.sql);
  console.log(sql);
}

export function createDiffCommand(): Command {
  const command = new Command('diff');

  command.description('Compare two schema versions and generate migration SQL').action(async () => {
    await runDiff();
  });

  return command;
}
