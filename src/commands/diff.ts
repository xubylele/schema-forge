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
  validateSchemaChanges,
  type SqlConfig
} from '../domain';
import { success, forceWarning } from '../utils/output';
import { confirmDestructiveOps } from '../utils/prompt';

export interface DiffOptions {
  safe?: boolean;
  force?: boolean;
}

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

export async function runDiff(options: DiffOptions = {}): Promise<void> {
  // Validate flag exclusivity
  if (options.safe && options.force) {
    throw new Error('Cannot use --safe and --force flags together. Choose one:\n  --safe: Block destructive operations\n  --force: Bypass safety checks');
  }

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

  // Handle --force flag: warn and bypass safety checks
  if (options.force) {
    forceWarning('Are you sure to use --force? This option will bypass safety checks for destructive operations.');
  }

  // Check for destructive operations in safe mode
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

  // Interactive prompt for destructive operations when neither --safe nor --force is used
  if (!options.safe && !options.force && diff.operations.length > 0) {
    const findings = await validateSchemaChanges(previousState, schema);
    const riskyFindings = findings.filter(f => f.severity === 'error' || f.severity === 'warning');
    
    if (riskyFindings.length > 0) {
      const confirmed = await confirmDestructiveOps(findings);
      
      if (!confirmed) {
        process.exitCode = 1;
        return;
      }
    }
  }

  if (diff.operations.length === 0) {
    success('No changes detected');
    return;
  }

  const sql = await generateSql(diff, provider, config.sql);
  console.log(sql);
}

export function createDiffCommand(): Command {
  const command = new Command('diff');

  command.description('Compare two schema versions and generate migration SQL').action(async (options: DiffOptions) => {
    await runDiff(options);
  });

  return command;
}
