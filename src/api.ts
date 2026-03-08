/**
 * Programmatic API for Schema Forge.
 * Use this entrypoint when integrating from Node (e.g. scripts, GitHub Actions)
 * instead of invoking the CLI via shell.
 *
 * @example
 * const { generate, EXIT_CODES } = require('@xubylele/schema-forge/api');
 * const result = await generate({ name: 'MyMigration' });
 * if (result.exitCode !== EXIT_CODES.SUCCESS) process.exit(result.exitCode);
 */

import type { DiffOptions } from './commands/diff';
import { runDiff } from './commands/diff';
import type { DoctorOptions } from './commands/doctor';
import { runDoctor } from './commands/doctor';
import type { GenerateOptions } from './commands/generate';
import { runGenerate } from './commands/generate';
import type { ImportOptions } from './commands/import';
import { runImport } from './commands/import';
import type { InitOptions } from './commands/init';
import { runInit } from './commands/init';
import type { IntrospectOptions } from './commands/introspect';
import { runIntrospect } from './commands/introspect';
import type { ValidateOptions } from './commands/validate';
import { runValidate } from './commands/validate';
import { EXIT_CODES } from './utils/exitCodes';

export { EXIT_CODES };
export type { DiffOptions, DoctorOptions, GenerateOptions, ImportOptions, InitOptions, IntrospectOptions, ValidateOptions };

/**
 * Result of a programmatic command run. Exit codes match the CLI contract.
 * @see docs/exit-codes.json
 */
export interface RunResult {
  exitCode: number;
}

function captureExitCode(): number {
  const raw = process.exitCode;
  process.exitCode = undefined;
  return typeof raw === 'number' ? raw : 0;
}

async function runWithResult(fn: () => Promise<void>): Promise<RunResult> {
  try {
    await fn();
    return { exitCode: captureExitCode() };
  } catch {
    process.exitCode = undefined;
    return { exitCode: EXIT_CODES.VALIDATION_ERROR };
  }
}

/**
 * Initialize a new schema project in the current directory.
 * @param options.provider - Database provider: 'postgres' (default) or 'supabase'. Supabase uses supabase/migrations for output.
 */
export async function init(options: InitOptions = {}): Promise<RunResult> {
  return runWithResult(() => runInit(options));
}

/**
 * Generate SQL migration from schema files.
 */
export async function generate(options: GenerateOptions = {}): Promise<RunResult> {
  return runWithResult(() => runGenerate(options));
}

/**
 * Compare two schema versions and generate migration SQL (optionally against live DB).
 */
export async function diff(options: DiffOptions = {}): Promise<RunResult> {
  return runWithResult(() => runDiff(options));
}

/**
 * Check live database drift against state.
 */
export async function doctor(options: DoctorOptions = {}): Promise<RunResult> {
  return runWithResult(() => runDoctor(options));
}

/**
 * Validate schema and optionally check for destructive changes or live drift.
 */
export async function validate(options: ValidateOptions = {}): Promise<RunResult> {
  return runWithResult(() => runValidate(options));
}

/**
 * Extract normalized live schema from PostgreSQL.
 */
export async function introspect(options: IntrospectOptions = {}): Promise<RunResult> {
  return runWithResult(() => runIntrospect(options));
}

/**
 * Import schema from SQL migrations.
 * @param inputPath - Path to .sql file or migrations directory
 */
export async function importSchema(inputPath: string, options: ImportOptions = {}): Promise<RunResult> {
  return runWithResult(() => runImport(inputPath, options));
}
