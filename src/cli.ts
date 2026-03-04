#!/usr/bin/env node
import { Command } from 'commander';
import pkg from '../package.json';
import { runDiff } from './commands/diff';
import { runDoctor } from './commands/doctor';
import { runGenerate } from './commands/generate';
import { runImport } from './commands/import';
import { runInit } from './commands/init';
import { runIntrospect } from './commands/introspect';
import { runValidate } from './commands/validate';
import { isSchemaValidationError } from './domain';
import { EXIT_CODES } from './utils/exitCodes';
import { error as printError } from './utils/output';
import { seedLastSeenVersion, showWhatsNewIfUpdated } from './utils/whatsNew';

const program = new Command();

program
  .name('schema-forge')
  .description('CLI tool for schema management and SQL generation')
  .version(pkg.version)
  .option('--safe', 'Prevent execution of destructive operations')
  .option('--force', 'Force execution by bypassing safety checks and CI detection');

interface GlobalOptions {
  safe?: boolean;
  force?: boolean;
}

function validateFlagExclusivity(options: GlobalOptions): void {
  if (options.safe && options.force) {
    throw new Error('Cannot use --safe and --force flags together. Choose one:\n  --safe: Block destructive operations\n  --force: Bypass safety checks');
  }
}

async function handleError(error: unknown): Promise<void> {
  if ((await isSchemaValidationError(error)) && error instanceof Error) {
    printError(error.message);
    // Validation errors (schema DSL, config, etc.) map to exit code 1
    process.exitCode = EXIT_CODES.VALIDATION_ERROR;
    return;
  }

  if (error instanceof Error) {
    printError(error.message);
  } else {
    printError('Unexpected error');
  }

  // All other errors map to validation error exit code
  process.exitCode = EXIT_CODES.VALIDATION_ERROR;
}

// Register commands
program
  .command('init')
  .description('Initialize a new schema project')
  .action(async () => {
    try {
      await runInit();
    } catch (error) {
      await handleError(error);
    }
  });

program
  .command('generate')
  .description('Generate SQL from schema files. In CI environments (CI=true), exits with code 3 if destructive operations are detected unless --force is used.')
  .option('--name <string>', 'Schema name to generate')
  .action(async (options) => {
    try {
      const globalOptions = program.opts();
      validateFlagExclusivity(globalOptions);
      await runGenerate({ ...options, ...globalOptions });
    } catch (error) {
      await handleError(error);
    }
  });

program
  .command('diff')
  .description('Compare two schema versions and generate migration SQL. In CI environments (CI=true), exits with code 3 if destructive operations are detected unless --force is used.')
  .option('--url <string>', 'PostgreSQL connection URL for live diff (defaults to DATABASE_URL)')
  .option('--schema <list>', 'Comma-separated schema names to introspect (default: public)')
  .action(async (options) => {
    try {
      const globalOptions = program.opts();
      validateFlagExclusivity(globalOptions);
      await runDiff({ ...options, ...globalOptions });
    } catch (error) {
      await handleError(error);
    }
  });

program
  .command('doctor')
  .description('Check live database drift against state. Exits with code 2 when drift is detected.')
  .option('--json', 'Output structured JSON')
  .option('--url <string>', 'PostgreSQL connection URL (defaults to DATABASE_URL)')
  .option('--schema <list>', 'Comma-separated schema names to introspect (default: public)')
  .action(async (options) => {
    try {
      await runDoctor(options);
    } catch (error) {
      await handleError(error);
    }
  });

program
  .command('introspect')
  .description('Extract normalized live schema from PostgreSQL')
  .option('--url <string>', 'PostgreSQL connection URL (defaults to DATABASE_URL)')
  .option('--schema <list>', 'Comma-separated schema names (default: public)')
  .option('--json', 'Output normalized schema JSON to stdout')
  .option('--out <path>', 'Write normalized schema JSON to a file')
  .action(async (options) => {
    try {
      await runIntrospect(options);
    } catch (error) {
      await handleError(error);
    }
  });

program
  .command('import')
  .description('Import schema from SQL migrations')
  .argument('<path>', 'Path to .sql file or migrations directory')
  .option('--out <path>', 'Output schema file path')
  .action(async (targetPath, options) => {
    try {
      await runImport(targetPath, options);
    } catch (error) {
      await handleError(error);
    }
  });

program
  .command('validate')
  .description('Detect destructive or risky schema changes. In CI environments (CI=true), exits with code 3 if destructive operations are detected.')
  .option('--json', 'Output structured JSON')
  .option('--url <string>', 'PostgreSQL connection URL for live drift validation (defaults to DATABASE_URL)')
  .option('--schema <list>', 'Comma-separated schema names to introspect (default: public)')
  .action(async (options) => {
    try {
      await runValidate(options);
    } catch (error) {
      await handleError(error);
    }
  });

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  await seedLastSeenVersion(pkg.version);
  await showWhatsNewIfUpdated(pkg.version, argv);

  // Parse command line arguments
  program.parse(process.argv);

  // Show help if no command is provided
  if (!argv.length) {
    program.outputHelp();
  }
}

void main();
