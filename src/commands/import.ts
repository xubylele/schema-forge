import { Command } from 'commander';
import path from 'path';
import { fileExists, readJsonFile, writeTextFile } from '../core/fs';
import { getConfigPath, getProjectRoot, getSchemaFilePath } from '../core/paths';
import { applySqlOps } from '../core/sql/apply-ops';
import { loadMigrationSqlInput } from '../core/sql/load-migrations';
import { parseMigrationSql } from '../core/sql/parse-migration';
import { schemaToDsl } from '../core/sql/schema-to-dsl';
import { info, success, warning } from '../utils/output';

interface ImportConfig {
  schemaFile?: string;
}

export interface ImportOptions {
  out?: string;
}

function resolveConfigPath(root: string, targetPath: string): string {
  return path.isAbsolute(targetPath) ? targetPath : path.join(root, targetPath);
}

export async function runImport(inputPath: string, options: ImportOptions = {}): Promise<void> {
  const root = getProjectRoot();
  const absoluteInputPath = resolveConfigPath(root, inputPath);
  const inputs = await loadMigrationSqlInput(absoluteInputPath);

  if (inputs.length === 0) {
    throw new Error(`No .sql migration files found in: ${absoluteInputPath}`);
  }

  const allOps = [];
  const parseWarnings: Array<{ statement: string; reason: string }> = [];

  for (const input of inputs) {
    const result = parseMigrationSql(input.sql);
    allOps.push(...result.ops);
    parseWarnings.push(...result.warnings.map(item => ({
      statement: `[${path.basename(input.filePath)}] ${item.statement}`,
      reason: item.reason
    })));
  }

  const applied = applySqlOps(allOps);
  const dsl = schemaToDsl(applied.schema);

  let targetPath = options.out;
  if (!targetPath) {
    const configPath = getConfigPath(root);
    if (await fileExists(configPath)) {
      const config = await readJsonFile<ImportConfig>(configPath, {});
      if (typeof config.schemaFile === 'string' && config.schemaFile.length > 0) {
        targetPath = config.schemaFile;
      }
    }
  }

  const schemaPath = targetPath
    ? resolveConfigPath(root, targetPath)
    : getSchemaFilePath(root);

  await writeTextFile(schemaPath, dsl);

  success(`Imported ${inputs.length} migration file(s) into ${schemaPath}`);
  info(`Parsed ${allOps.length} supported DDL operation(s)`);

  const warnings = [...parseWarnings, ...applied.warnings];
  if (warnings.length > 0) {
    warning(`Ignored ${warnings.length} unsupported item(s)`);
    for (const item of warnings.slice(0, 10)) {
      warning(`${item.reason}: ${item.statement}`);
    }
    if (warnings.length > 10) {
      warning(`...and ${warnings.length - 10} more`);
    }
  }
}

export function createImportCommand(): Command {
  const command = new Command('import');

  command
    .description('Import schema from SQL migration file or directory')
    .argument('<path>', 'Path to .sql file or migrations directory')
    .option('--out <path>', 'Output schema file path')
    .action(async (targetPath: string, options: ImportOptions) => {
      await runImport(targetPath, options);
    });

  return command;
}
