import { Command } from 'commander';
import path from 'path';
import {
  createSchemaValidationError,
  loadState,
  parseSchema,
  toValidationReport,
  validateSchema,
  validateSchemaChanges
} from '../domain';
import { fileExists, readJsonFile, readTextFile } from '../core/fs';
import { getConfigPath, getProjectRoot } from '../core/paths';
import { success } from '../utils/output';

export interface ValidateOptions {
  json?: boolean;
}

interface ValidateConfig {
  schemaFile: string;
  stateFile: string;
}

const REQUIRED_CONFIG_FIELDS: Array<keyof ValidateConfig> = ['schemaFile', 'stateFile'];

function resolveConfigPath(root: string, targetPath: string): string {
  return path.isAbsolute(targetPath) ? targetPath : path.join(root, targetPath);
}

export async function runValidate(options: ValidateOptions = {}): Promise<void> {
  const root = getProjectRoot();
  const configPath = getConfigPath(root);

  if (!(await fileExists(configPath))) {
    throw new Error('SchemaForge project not initialized. Run "schema-forge init" first.');
  }

  const config = await readJsonFile<ValidateConfig>(configPath, {} as ValidateConfig);

  for (const field of REQUIRED_CONFIG_FIELDS) {
    const value = config[field];
    if (!value || typeof value !== 'string') {
      throw new Error(`Invalid config: '${field}' is required`);
    }
  }

  const schemaPath = resolveConfigPath(root, config.schemaFile);
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
  const findings = await validateSchemaChanges(previousState, schema);
  const report = await toValidationReport(findings);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.hasErrors ? 1 : 0;
    return;
  }

  if (findings.length === 0) {
    success('No destructive changes detected');
    process.exitCode = 0;
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

  process.exitCode = report.hasErrors ? 1 : 0;
}

export function createValidateCommand(): Command {
  const command = new Command('validate');

  command
    .description('Detect destructive or risky schema changes against state')
    .option('--json', 'Output structured JSON')
    .action(async (options: ValidateOptions) => {
      await runValidate(options);
    });

  return command;
}
