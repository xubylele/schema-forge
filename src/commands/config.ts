import { fileExists, readJsonFile, writeJsonFile } from '../core/fs';
import { getConfigPath, getProjectRoot } from '../core/paths';
import type { MigrationFileNameFormat } from '../core/utils';
import { EXIT_CODES } from '../utils/exitCodes';
import { success } from '../utils/output';

const MIGRATION_FORMATS: MigrationFileNameFormat[] = ['hyphen', 'underscore'];

export interface ConfigOptions {
  migrationFormat?: MigrationFileNameFormat;
}

interface SchemaForgeConfig {
  schemaFile?: string;
  stateFile?: string;
  outputDir?: string;
  provider?: string;
  migrationFileNameFormat?: MigrationFileNameFormat;
  sql?: Record<string, string>;
  [key: string]: unknown;
}

export async function runConfig(options: ConfigOptions): Promise<void> {
  const root = getProjectRoot();
  const configPath = getConfigPath(root);

  if (!(await fileExists(configPath))) {
    throw new Error('SchemaForge project not initialized. Run "schema-forge init" first.');
  }

  const config = await readJsonFile<SchemaForgeConfig>(configPath, {} as SchemaForgeConfig);

  if (options.migrationFormat !== undefined) {
    const format = options.migrationFormat.trim().toLowerCase();
    if (!MIGRATION_FORMATS.includes(format as MigrationFileNameFormat)) {
      throw new Error(
        `Invalid migration format "${options.migrationFormat}". Allowed: ${MIGRATION_FORMATS.join(', ')}.`
      );
    }
    config.migrationFileNameFormat = format as MigrationFileNameFormat;
  }

  await writeJsonFile(configPath, config);
  success(`Updated ${configPath}`);
  if (options.migrationFormat !== undefined) {
    success(`migrationFileNameFormat set to "${config.migrationFileNameFormat}" (${config.migrationFileNameFormat === 'hyphen' ? 'timestamp-name.sql' : 'timestamp_name.sql'})`);
  }
  process.exitCode = EXIT_CODES.SUCCESS;
}
