import { Command } from 'commander';
import path from 'path';
import { ensureDir, fileExists, readJsonFile, readTextFile, writeTextFile } from '../core/fs';
import { getConfigPath, getProjectRoot } from '../core/paths';
import { resolveProvider } from '../core/provider';
import {
  migrationFileName,
  nowTimestamp,
  slugifyName,
  type MigrationFileNameFormat
} from '../core/utils';
import {
  createSchemaValidationError,
  diffSchemas,
  generateSql,
  loadState,
  parseSchema,
  saveState,
  schemaToState,
  validateSchema,
  validateSchemaChanges,
  type SqlConfig
} from '../domain';
import { EXIT_CODES } from '../utils/exitCodes';
import { forceWarning, info, success } from '../utils/output';
import { confirmDestructiveOps } from '../utils/prompt';

export interface GenerateOptions {
  name?: string;
  safe?: boolean;
  force?: boolean;
  migrationFormat?: MigrationFileNameFormat;
}

interface GenerateConfig {
  schemaFile: string;
  stateFile: string;
  outputDir: string;
  provider?: string;
  sql?: SqlConfig;
  migrationFileNameFormat?: MigrationFileNameFormat;
}

const REQUIRED_CONFIG_FIELDS: Array<keyof GenerateConfig> = [
  'schemaFile',
  'stateFile',
  'outputDir'
];

const MIGRATION_FORMATS: MigrationFileNameFormat[] = ['hyphen', 'underscore'];

function resolveMigrationFormat(
  cliFormat?: string,
  configFormat?: MigrationFileNameFormat
): MigrationFileNameFormat {
  if (cliFormat !== undefined && cliFormat !== '') {
    const normalized = cliFormat.trim().toLowerCase();
    if (MIGRATION_FORMATS.includes(normalized as MigrationFileNameFormat)) {
      return normalized as MigrationFileNameFormat;
    }
    throw new Error(
      `Invalid --migration-format "${cliFormat}". Allowed: ${MIGRATION_FORMATS.join(', ')}.`
    );
  }
  return configFormat ?? 'hyphen';
}

function resolveConfigPath(root: string, targetPath: string): string {
  return path.isAbsolute(targetPath) ? targetPath : path.join(root, targetPath);
}

export async function runGenerate(options: GenerateOptions): Promise<void> {
  if (options.safe && options.force) {
    throw new Error('Cannot use --safe and --force flags together. Choose one:\n  --safe: Block destructive operations\n  --force: Bypass safety checks');
  }

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

  const { provider, usedDefault } = resolveProvider(config.provider);
  if (usedDefault) {
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

  if (options.force) {
    forceWarning('Are you sure to use --force? This option will bypass safety checks for destructive operations.');
  }

  if (options.safe && !options.force && diff.operations.length > 0) {
    const findings = await validateSchemaChanges(previousState, schema);
    const destructiveFindings = findings.filter(f => f.severity === 'error');

    if (destructiveFindings.length > 0) {
      const errorMessages = destructiveFindings.map(f => {
        const target = f.column ? `${f.table}.${f.column}` : f.table;
        const typeRange = f.from && f.to ? ` (${f.from} -> ${f.to})` : '';
        return `  - ${f.code}: ${target}${typeRange}`;
      }).join('\n');

      throw await createSchemaValidationError(
        `Cannot proceed with --safe flag: Found ${destructiveFindings.length} destructive operation(s):\n${errorMessages}\n\nRemove --safe flag or modify schema to avoid destructive changes.`
      );
    }
  }

  if (!options.safe && !options.force && diff.operations.length > 0) {
    const findings = await validateSchemaChanges(previousState, schema);
    const riskyFindings = findings.filter(f => f.severity === 'error' || f.severity === 'warning');

    if (riskyFindings.length > 0) {
      const confirmed = await confirmDestructiveOps(findings);

      if (!confirmed) {
        if (process.exitCode !== EXIT_CODES.CI_DESTRUCTIVE) {
          process.exitCode = EXIT_CODES.VALIDATION_ERROR;
        }
        return;
      }
    }
  }

  if (diff.operations.length === 0) {
    info('No changes detected');
    process.exitCode = EXIT_CODES.SUCCESS;
    return;
  }

  const sql = await generateSql(diff, provider, config.sql);
  const timestamp = nowTimestamp();
  const slug = slugifyName(options.name ?? 'migration');
  const format = resolveMigrationFormat(
    options.migrationFormat as string | undefined,
    config.migrationFileNameFormat
  );
  const fileName = migrationFileName(timestamp, slug, format);

  await ensureDir(outputDir);
  const migrationPath = path.join(outputDir, fileName);
  await writeTextFile(migrationPath, sql + '\n');

  const nextState = await schemaToState(schema);
  await saveState(statePath, nextState);

  success(`SQL generated successfully: ${migrationPath}`);
  process.exitCode = EXIT_CODES.SUCCESS;
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
