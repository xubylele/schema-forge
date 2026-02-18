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

export async function runInit(): Promise<void> {
  const root = getProjectRoot();
  const schemaForgeDir = getSchemaForgeDir(root);

  // Check if schemaforge directory or any file exists
  if (await fileExists(schemaForgeDir)) {
    console.error('Error: schemaforge/ directory already exists');
    console.error('Please remove it or run init in a different directory');
    process.exit(1);
  }

  const schemaFilePath = getSchemaFilePath(root);
  const configPath = getConfigPath(root);
  const statePath = getStatePath(root);

  // Check individual files just to be safe
  if (await fileExists(schemaFilePath)) {
    console.error(`Error: ${schemaFilePath} already exists`);
    process.exit(1);
  }
  if (await fileExists(configPath)) {
    console.error(`Error: ${configPath} already exists`);
    process.exit(1);
  }
  if (await fileExists(statePath)) {
    console.error(`Error: ${statePath} already exists`);
    process.exit(1);
  }

  console.log('Initializing schema project...');

  // Create schemaforge directory
  await ensureDir(schemaForgeDir);

  // Create schema.sf file with exact content
  const schemaContent = `# SchemaForge schema definition
# Run: schemaforge generate

table users {
  id uuid pk
  created_at timestamptz default now()
}
`;
  await writeTextFile(schemaFilePath, schemaContent);
  console.log(`✓ Created ${schemaFilePath}`);

  // Create config.json
  const config = {
    provider: 'supabase',
    outputDir: 'supabase/migrations',
    schemaFile: 'schemaforge/schema.sf',
    stateFile: 'schemaforge/state.json',
    sql: {
      uuidDefault: 'gen_random_uuid()',
      timestampDefault: 'now()'
    }
  };
  await writeJsonFile(configPath, config);
  console.log(`✓ Created ${configPath}`);

  // Create state.json
  const state = {
    version: 1,
    tables: {}
  };
  await writeJsonFile(statePath, state);
  console.log(`✓ Created ${statePath}`);

  // Create output directory if it doesn't exist
  const outputDir = 'supabase/migrations';
  await ensureDir(outputDir);
  console.log(`✓ Created ${outputDir}`);

  console.log('\n✓ Project initialized successfully');
  console.log('Next steps:');
  console.log('  1. Edit schemaforge/schema.sf to define your schema');
  console.log('  2. Run: schemaforge generate');
}

export function createInitCommand(): Command {
  const command = new Command('init');

  command.description('Initialize a new schema project').action(async () => {
    await runInit();
  });

  return command;
}
