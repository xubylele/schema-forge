#!/usr/bin/env node

import { Command } from 'commander';
import pkg from '../package.json';
import { runDiff } from './commands/diff';
import { runGenerate } from './commands/generate';
import { runInit } from './commands/init';
import { SchemaValidationError } from './core/errors';
import { error as printError } from './utils/output';

const program = new Command();

program
  .name('schema-forge')
  .description('CLI tool for schema management and SQL generation')
  .version(pkg.version);

function handleError(error: unknown): void {
  if (error instanceof SchemaValidationError) {
    printError(error.message);
    process.exitCode = 2;
    return;
  }

  if (error instanceof Error) {
    printError(error.message);
  } else {
    printError('Unexpected error');
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
