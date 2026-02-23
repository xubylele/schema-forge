import { Command } from 'commander';
import path from 'path';
import { SchemaValidationError } from '../core/errors';
import { diffSchemas } from '../core/diff';
import { ensureDir, readJsonFile, readTextFile, writeTextFile, fileExists } from '../core/fs';
import { parseSchema } from '../core/parser';
import { getConfigPath, getProjectRoot } from '../core/paths';
import { loadState, saveState, schemaToState } from '../core/state-manager';
import { validateSchema } from '../core/validator';
import { generateSql, Provider, SqlConfig } from '../generator/sql-generator';

export interface GenerateOptions {
  name?: string;
}

interface GenerateConfig {
  schemaFile: string;
  stateFile: string;
  outputDir: string;
  provider?: string;
  sql?: SqlConfig;
}

const REQUIRED_CONFIG_FIELDS: Array<keyof GenerateConfig> = [
  'schemaFile',
  'stateFile',
  'outputDir'
];

function resolveConfigPath(root: string, targetPath: string): string {
  return path.isAbsolute(targetPath) ? targetPath : path.join(root, targetPath);
}

function formatTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    String(date.getFullYear()) +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

function toKebabCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'migration';
}

export async function runGenerate(options: GenerateOptions): Promise<void> {
  const root = getProjectRoot();
  const configPath = getConfigPath(root);

  if (!(await fileExists(configPath))) {
    throw new Error('SchemaForge project not initialized. Run "schemaforge init" first.');
  }

  const config = await readJsonFile<GenerateConfig>(configPath, {} as GenerateConfig);

  for (const field of REQUIRED_CONFIG_FIELDS) {
    const value = config[field];
    if (!value || typeof value !== 'string') {
      throw new Error(`Invalid config: '${field}' is required`);
    }
  }

  const schemaPath = resolveConfigPath(root, config.schemaFile);
  const statePath = resolveConfigPath(root, config.stateFile);
  const outputDir = resolveConfigPath(root, config.outputDir);

  if (config.provider && config.provider !== 'postgres' && config.provider !== 'supabase') {
    throw new Error(`Unsupported provider '${config.provider}'.`);
  }

  const provider: Provider = (config.provider ?? 'postgres') as Provider;
  if (!config.provider) {
    console.log('Provider not set; defaulting to postgres.');
  }

  console.log('Generating SQL...');

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
    console.log('No changes detected');
    return;
  }

  const sql = generateSql(diff, provider, config.sql);
  const timestamp = formatTimestamp(new Date());
  const slug = toKebabCase(options.name ?? 'migration');
  const fileName = `${timestamp}-${slug}.sql`;

  await ensureDir(outputDir);
  const migrationPath = path.join(outputDir, fileName);
  await writeTextFile(migrationPath, sql + '\n');

  const nextState = await schemaToState(schema);
  await saveState(statePath, nextState);

  console.log(`✓ SQL generated successfully: ${migrationPath}`);
}

export function createGenerateCommand(): Command {
  const command = new Command('generate');

  command
    .description('Generate SQL from schema files')
    .option('--name <string>', 'Schema name to generate')
    .action(async (options: GenerateOptions) => {
      await runGenerate(options);
    });

  return command;
}
