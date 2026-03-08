import { Command } from 'commander';
import path from 'path';
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

export type InitProvider = 'postgres' | 'supabase';

const ALLOWED_PROVIDERS: InitProvider[] = ['postgres', 'supabase'];

export interface InitOptions {
  provider?: string;
}

function resolveInitProvider(provider?: string): InitProvider {
  if (!provider) {
    return 'postgres';
  }
  const normalized = provider.trim().toLowerCase();
  if (ALLOWED_PROVIDERS.includes(normalized as InitProvider)) {
    return normalized as InitProvider;
  }
  throw new Error(
    `Invalid provider "${provider}". Allowed values: ${ALLOWED_PROVIDERS.join(', ')}.`
  );
}

export async function runInit(options?: InitOptions): Promise<void> {
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

  const provider = resolveInitProvider(options?.provider);

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

  let outputDir: string;
  if (provider === 'supabase') {
    const supabaseDir = path.join(root, 'supabase');
    const migrationsDir = path.join(root, 'supabase', 'migrations');
    if (!(await fileExists(supabaseDir))) {
      await ensureDir(migrationsDir);
      success(`Created supabase/migrations`);
    } else {
      await ensureDir(migrationsDir);
      success(`Using existing supabase/; migrations at supabase/migrations`);
    }
    outputDir = 'supabase/migrations';
  } else {
    outputDir = 'migrations';
    await ensureDir(path.join(root, outputDir));
    success(`Created ${outputDir}`);
  }

  const config = {
    provider,
    outputDir,
    schemaFile: 'schemaforge/schema.sf',
    stateFile: 'schemaforge/state.json',
    sql: {
      uuidDefault: 'gen_random_uuid()',
      timestampDefault: 'now()'
    }
  };
  await writeJsonFile(configPath, config);
  success(`Created ${configPath}`);

  const state = {
    version: 1,
    tables: {}
  };
  await writeJsonFile(statePath, state);
  success(`Created ${statePath}`);

  success('Project initialized successfully');
  info('Next steps:');
  info('  1. Edit schemaforge/schema.sf to define your schema');
  info('  2. Run: schema-forge generate');
  process.exitCode = EXIT_CODES.SUCCESS;
}

export function createInitCommand(): Command {
  const command = new Command('init');

  command
    .description(
      'Initialize a new schema project. Optional provider: postgres (default) or supabase. Supabase uses supabase/migrations for output.'
    )
    .argument('[provider]', 'Database provider: postgres or supabase')
    .option('--provider <provider>', 'Database provider: postgres or supabase (overrides argument)')
    .action(async (providerArg: string | undefined, options: { provider?: string }) => {
      const provider = options?.provider ?? providerArg;
      await runInit({ provider });
    });

  return command;
}
