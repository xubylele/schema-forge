import { Command } from 'commander';
import path from 'path';
import { fileExists, readJsonFile, readTextFile } from '../core/fs';
import { getConfigPath, getProjectRoot } from '../core/paths';
import {
  analyzeSchemaDrift,
  createSchemaValidationError,
  introspectPostgresSchema,
  loadState,
  parseSchema,
  toValidationReport,
  validateSchema,
  validateSchemaChanges
} from '../domain';
import { parseSchemaList, resolvePostgresConnectionString, withPostgresQueryExecutor } from '../core/postgres';
import { EXIT_CODES, shouldFailCIDestructive } from '../utils/exitCodes';
import { success } from '../utils/output';
import { hasDestructiveFindings, isCI } from '../utils/prompt';

export interface ValidateOptions {
  json?: boolean;
  url?: string;
  schema?: string;
  force?: boolean;
}

interface ValidateConfig {
  schemaFile: string;
  stateFile?: string;
}

function resolveConfigPath(root: string, targetPath: string): string {
  return path.isAbsolute(targetPath) ? targetPath : path.join(root, targetPath);
}

export async function runValidate(options: ValidateOptions = {}): Promise<void> {
  const root = getProjectRoot();
  const configPath = getConfigPath(root);
  const useLiveDatabase = Boolean(options.url || process.env.DATABASE_URL);

  if (!(await fileExists(configPath))) {
    throw new Error('SchemaForge project not initialized. Run "schema-forge init" first.');
  }

  const config = await readJsonFile<ValidateConfig>(configPath, {} as ValidateConfig);

  const requiredFields: Array<keyof ValidateConfig> = ['schemaFile', 'stateFile'];
  for (const field of requiredFields) {
    const value = config[field];
    if (!value || typeof value !== 'string') {
      throw new Error(`Invalid config: '${field}' is required`);
    }
  }

  const schemaPath = resolveConfigPath(root, config.schemaFile);
  if (!config.stateFile) {
    throw new Error("Invalid config: 'stateFile' is required");
  }
  const statePath = resolveConfigPath(root, config.stateFile);

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

  if (useLiveDatabase) {
    const schemaFilters = parseSchemaList(options.schema);
    const liveSchema = await withPostgresQueryExecutor(
      resolvePostgresConnectionString({ url: options.url }),
      query => introspectPostgresSchema({
        query,
        ...(schemaFilters ? { schemas: schemaFilters } : {}),
      })
    );
    const driftReport = await analyzeSchemaDrift(previousState, liveSchema);
    const hasDrift = driftReport.missingTables.length > 0
      || driftReport.extraTables.length > 0
      || driftReport.columnDifferences.length > 0
      || driftReport.typeMismatches.length > 0;

    process.exitCode = hasDrift ? EXIT_CODES.DRIFT_DETECTED : EXIT_CODES.SUCCESS;

    if (options.json) {
      console.log(JSON.stringify(driftReport, null, 2));
      return;
    }

    if (!hasDrift) {
      success('No schema drift detected');
      return;
    }

    if (driftReport.missingTables.length > 0) {
      console.log(`Missing tables in live DB: ${driftReport.missingTables.join(', ')}`);
    }
    if (driftReport.extraTables.length > 0) {
      console.log(`Extra tables in live DB: ${driftReport.extraTables.join(', ')}`);
    }
    for (const difference of driftReport.columnDifferences) {
      if (difference.missingInLive.length > 0) {
        console.log(`Missing columns in ${difference.tableName}: ${difference.missingInLive.join(', ')}`);
      }
      if (difference.extraInLive.length > 0) {
        console.log(`Extra columns in ${difference.tableName}: ${difference.extraInLive.join(', ')}`);
      }
    }
    for (const mismatch of driftReport.typeMismatches) {
      console.log(`Type mismatch ${mismatch.tableName}.${mismatch.columnName}: ${mismatch.expectedType} -> ${mismatch.actualType}`);
    }
    return;
  }

  const findings = await validateSchemaChanges(previousState, schema);
  const report = await toValidationReport(findings);

  // Determine exit code: 3 in CI with destructive findings unless --force, 1 if errors, 0 otherwise
  if (shouldFailCIDestructive(isCI(), hasDestructiveFindings(findings), Boolean(options.force))) {
    process.exitCode = EXIT_CODES.CI_DESTRUCTIVE;
  } else {
    process.exitCode = report.hasErrors ? EXIT_CODES.VALIDATION_ERROR : EXIT_CODES.SUCCESS;
  }

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (findings.length === 0) {
    success('No destructive changes detected');
    return;
  }

  console.log(
    `Validation Summary: ${report.errors.length} error(s), ${report.warnings.length} warning(s)`
  );

  const tableOrder = Array.from(new Set(findings.map(finding => finding.table)));

  for (const tableName of tableOrder) {
    console.log(tableName);
    for (const finding of findings.filter(entry => entry.table === tableName)) {
      const target = finding.column ? `${finding.table}.${finding.column}` : finding.table;
      const typeRange = finding.from && finding.to ? ` (${finding.from} -> ${finding.to})` : '';
      console.log(
        `${finding.severity.toUpperCase()}: ${finding.code} ${target}${typeRange} - ${finding.message}`
      );
    }
  }
}

export function createValidateCommand(): Command {
  const command = new Command('validate');

  command
    .description('Detect destructive or risky schema changes against state')
    .option('--json', 'Output structured JSON')
    .option('--url <string>', 'PostgreSQL connection URL for live drift validation (defaults to DATABASE_URL)')
    .option('--schema <list>', 'Comma-separated schema names to introspect (default: public)')
    .action(async (options: ValidateOptions) => {
      await runValidate(options);
    });

  return command;
}
