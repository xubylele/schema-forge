import { Command } from 'commander';
import path from 'path';
import { fileExists, readJsonFile } from '../core/fs';
import { getConfigPath, getProjectRoot } from '../core/paths';
import {
  parseSchemaList,
  resolvePostgresConnectionString,
  withPostgresQueryExecutor,
} from '../core/postgres';
import {
  analyzeSchemaDrift,
  introspectPostgresSchema,
  loadState,
  type DriftReport,
} from '../domain';
import { EXIT_CODES } from '../utils/exitCodes';
import { success } from '../utils/output';

export interface DoctorOptions {
  json?: boolean;
  url?: string;
  schema?: string;
}

interface DoctorConfig {
  stateFile?: string;
}

function resolveConfigPath(root: string, targetPath: string): string {
  return path.isAbsolute(targetPath) ? targetPath : path.join(root, targetPath);
}

function hasDrift(report: DriftReport): boolean {
  return report.missingTables.length > 0
    || report.extraTables.length > 0
    || report.columnDifferences.length > 0
    || report.typeMismatches.length > 0;
}

function printDriftReport(report: DriftReport): void {
  if (report.missingTables.length > 0) {
    console.log(`Missing tables in live DB: ${report.missingTables.join(', ')}`);
  }
  if (report.extraTables.length > 0) {
    console.log(`Extra tables in live DB: ${report.extraTables.join(', ')}`);
  }
  for (const difference of report.columnDifferences) {
    if (difference.missingInLive.length > 0) {
      console.log(`Missing columns in ${difference.tableName}: ${difference.missingInLive.join(', ')}`);
    }
    if (difference.extraInLive.length > 0) {
      console.log(`Extra columns in ${difference.tableName}: ${difference.extraInLive.join(', ')}`);
    }
  }
  for (const mismatch of report.typeMismatches) {
    console.log(`Type mismatch ${mismatch.tableName}.${mismatch.columnName}: ${mismatch.expectedType} -> ${mismatch.actualType}`);
  }
}

export async function runDoctor(options: DoctorOptions = {}): Promise<void> {
  const root = getProjectRoot();
  const configPath = getConfigPath(root);

  if (!(await fileExists(configPath))) {
    throw new Error('SchemaForge project not initialized. Run "schema-forge init" first.');
  }

  const config = await readJsonFile<DoctorConfig>(configPath, {});
  if (!config.stateFile || typeof config.stateFile !== 'string') {
    throw new Error("Invalid config: 'stateFile' is required");
  }

  const statePath = resolveConfigPath(root, config.stateFile);
  const previousState = await loadState(statePath);
  const schemaFilters = parseSchemaList(options.schema);
  const liveSchema = await withPostgresQueryExecutor(
    resolvePostgresConnectionString({ url: options.url }),
    query => introspectPostgresSchema({
      query,
      ...(schemaFilters ? { schemas: schemaFilters } : {}),
    })
  );
  const driftReport = await analyzeSchemaDrift(previousState, liveSchema);
  const detected = hasDrift(driftReport);

  process.exitCode = detected ? EXIT_CODES.DRIFT_DETECTED : EXIT_CODES.SUCCESS;

  if (options.json) {
    console.log(JSON.stringify(driftReport, null, 2));
    return;
  }

  if (!detected) {
    success('No schema drift detected');
    return;
  }

  console.log('Schema drift detected');
  printDriftReport(driftReport);
}

export function createDoctorCommand(): Command {
  const command = new Command('doctor');

  command
    .description('Check schema drift between state and live PostgreSQL')
    .option('--json', 'Output structured JSON')
    .option('--url <string>', 'PostgreSQL connection URL (defaults to DATABASE_URL)')
    .option('--schema <list>', 'Comma-separated schema names to introspect (default: public)')
    .action(async (options: DoctorOptions) => {
      await runDoctor(options);
    });

  return command;
}
