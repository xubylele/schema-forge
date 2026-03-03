import { Command } from 'commander';
import {
  ensureDir,
  fileExists,
  writeJsonFile,
  writeTextFile
} from '../core/fs';
import {
  getConfigPath,
  getProjectRoot,
  getSchemaFilePath,
  getSchemaForgeDir,
  getStatePath
} from '../core/paths';
import { EXIT_CODES } from '../utils/exitCodes';
import { info, success } from '../utils/output';

export async function runInit(): Promise<void> {
  const root = getProjectRoot();
  const schemaForgeDir = getSchemaForgeDir(root);

  // Check if schemaforge directory or any file exists
  if (await fileExists(schemaForgeDir)) {
    throw new Error('schemaforge/ directory already exists. Please remove it or run init in a different directory.');
  }

  const schemaFilePath = getSchemaFilePath(root);
  const configPath = getConfigPath(root);
  const statePath = getStatePath(root);

  // Check individual files just to be safe
  if (await fileExists(schemaFilePath)) {
    throw new Error(`${schemaFilePath} already exists`);
  }
  if (await fileExists(configPath)) {
    throw new Error(`${configPath} already exists`);
  }
  if (await fileExists(statePath)) {
    throw new Error(`${statePath} already exists`);
  }

  info('Initializing schema project...');

  // Create schemaforge directory
  await ensureDir(schemaForgeDir);

  // Create schema.sf file with exact content
  const schemaContent = `# SchemaForge schema definition
# Run: schema-forge generate

table users {
  id uuid pk
  created_at timestamptz default now()
}
`;
  await writeTextFile(schemaFilePath, schemaContent);
  success(`Created ${schemaFilePath}`);

  // Create config.json
  const config = {
    provider: 'postgres',
    outputDir: 'migrations',
    schemaFile: 'schemaforge/schema.sf',
    stateFile: 'schemaforge/state.json',
    sql: {
      uuidDefault: 'gen_random_uuid()',
      timestampDefault: 'now()'
    }
  };
  await writeJsonFile(configPath, config);
  success(`Created ${configPath}`);

  // Create state.json
  const state = {
    version: 1,
    tables: {}
  };
  await writeJsonFile(statePath, state);
  success(`Created ${statePath}`);

  // Create output directory if it doesn't exist
  const outputDir = 'migrations';
  await ensureDir(outputDir);
  success(`Created ${outputDir}`);

  success('Project initialized successfully');
  info('Next steps:');
  info('  1. Edit schemaforge/schema.sf to define your schema');
  info('  2. Run: schema-forge generate');
  process.exitCode = EXIT_CODES.SUCCESS;
}

export function createInitCommand(): Command {
  const command = new Command('init');

  command.description('Initialize a new schema project').action(async () => {
    await runInit();
  });

  return command;
}
