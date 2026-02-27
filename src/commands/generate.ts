import { Command } from 'commander';
import path from 'path';
import {
  createSchemaValidationError,
  diffSchemas,
  generateSql,
  loadState,
  parseSchema,
  saveState,
  schemaToState,
  validateSchema,
  type Provider,
  type SqlConfig
} from '../domain';
import { ensureDir, fileExists, readJsonFile, readTextFile, writeTextFile } from '../core/fs';
import { getConfigPath, getProjectRoot } from '../core/paths';
import { nowTimestamp, slugifyName } from '../core/utils';
import { info, success } from '../utils/output';

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

export async function runGenerate(options: GenerateOptions): Promise<void> {
  const root = getProjectRoot();
  const configPath = getConfigPath(root);

  if (!(await fileExists(configPath))) {
    throw new Error('SchemaForge project not initialized. Run "schema-forge init" first.');
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
    info('Provider not set; defaulting to postgres.');
  }

  info('Generating SQL...');

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
    info('No changes detected');
    return;
  }

  const sql = await generateSql(diff, provider, config.sql);
  const timestamp = nowTimestamp();
  const slug = slugifyName(options.name ?? 'migration');
  const fileName = `${timestamp}-${slug}.sql`;

  await ensureDir(outputDir);
  const migrationPath = path.join(outputDir, fileName);
  await writeTextFile(migrationPath, sql + '\n');

  const nextState = await schemaToState(schema);
  await saveState(statePath, nextState);

  success(`SQL generated successfully: ${migrationPath}`);
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
