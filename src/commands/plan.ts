import { Command } from 'commander';
import path from 'path';
import { fileExists, readJsonFile, readTextFile } from '../core/fs';
import { getConfigPath, getProjectRoot } from '../core/paths';
import { parseSchemaList, resolvePostgresConnectionString, withPostgresQueryExecutor } from '../core/postgres';
import {
  buildMigrationPlan,
  createSchemaValidationError,
  diffSchemas,
  introspectPostgresSchema,
  loadState,
  parseSchema,
  schemaToState,
  validateSchema,
  validateSchemaChanges,
} from '../domain';
import { EXIT_CODES } from '../utils/exitCodes';
import { forceWarning, success } from '../utils/output';
import { confirmDestructiveOps } from '../utils/prompt';

export interface PlanOptions {
  safe?: boolean;
  force?: boolean;
  url?: string;
  schema?: string;
}

interface PlanConfig {
  schemaFile: string;
  stateFile?: string;
}

function resolveConfigPath(root: string, targetPath: string): string {
  return path.isAbsolute(targetPath) ? targetPath : path.join(root, targetPath);
}

export async function runPlan(options: PlanOptions = {}): Promise<void> {
  if (options.safe && options.force) {
    throw new Error('Cannot use --safe and --force flags together. Choose one:\n  --safe: Block destructive operations\n  --force: Bypass safety checks');
  }

  const root = getProjectRoot();
  const configPath = getConfigPath(root);

  if (!(await fileExists(configPath))) {
    throw new Error('SchemaForge project not initialized. Run "schema-forge init" first.');
  }

  const config = await readJsonFile<PlanConfig>(configPath, {} as PlanConfig);
  const useLiveDatabase = Boolean(options.url || process.env.DATABASE_URL);

  const requiredFields: Array<keyof PlanConfig> = useLiveDatabase ? ['schemaFile'] : ['schemaFile', 'stateFile'];
  for (const field of requiredFields) {
    const value = config[field];
    if (!value || typeof value !== 'string') {
      throw new Error(`Invalid config: '${field}' is required`);
    }
  }

  const schemaPath = resolveConfigPath(root, config.schemaFile);
  const statePath = config.stateFile ? resolveConfigPath(root, config.stateFile) : null;

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

  const previousState = useLiveDatabase
    ? await withPostgresQueryExecutor(
      resolvePostgresConnectionString({ url: options.url }),
      async query => {
        const schemaFilters = parseSchemaList(options.schema);
        const liveSchema = await introspectPostgresSchema({
          query,
          ...(schemaFilters ? { schemas: schemaFilters } : {}),
        });
        return schemaToState(liveSchema);
      }
    )
    : await loadState(statePath ?? '');

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
    success('No changes detected');
    process.exitCode = EXIT_CODES.SUCCESS;
    return;
  }

  const plan = await buildMigrationPlan(diff);
  console.log(plan.lines.join('\n'));
  process.exitCode = EXIT_CODES.SUCCESS;
}

export function createPlanCommand(): Command {
  const command = new Command('plan');

  command
    .description('Preview migration operations as a human-readable plan')
    .option('--url <string>', 'PostgreSQL connection URL for live plan (defaults to DATABASE_URL)')
    .option('--schema <list>', 'Comma-separated schema names to introspect (default: public)')
    .action(async (options: PlanOptions) => {
      await runPlan(options);
    });

  return command;
}
