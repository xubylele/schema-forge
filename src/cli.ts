#!/usr/bin/env node

import { Command } from 'commander';
import { runInit } from './commands/init';
import { runGenerate } from './commands/generate';
import { runDiff } from './commands/diff';
import { SchemaValidationError } from './core/errors';

const program = new Command();

program
  .name('schemaforge')
  .description('CLI tool for schema management and SQL generation')
  .version('1.0.0');

function handleError(error: unknown): void {
  if (error instanceof SchemaValidationError) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Unexpected error');
  }

  process.exitCode = 1;
}

// Register commands
program
  .command('init')
  .description('Initialize a new schema project')
  .action(async () => {
    try {
      await runInit();
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('generate')
  .description('Generate SQL from schema files')
  .option('--name <string>', 'Schema name to generate')
  .action(async (options) => {
    try {
      await runGenerate(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('diff')
  .description('Compare two schema versions and generate migration SQL')
  .action(async () => {
    try {
      await runDiff();
    } catch (error) {
      handleError(error);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
