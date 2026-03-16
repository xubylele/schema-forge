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

export async function init(options: InitOptions = {}): Promise<RunResult> {
  return runWithResult(() => runInit(options));
}

export async function generate(options: GenerateOptions = {}): Promise<RunResult> {
  return runWithResult(() => runGenerate(options));
}

export async function diff(options: DiffOptions = {}): Promise<RunResult> {
  return runWithResult(() => runDiff(options));
}

export async function doctor(options: DoctorOptions = {}): Promise<RunResult> {
  return runWithResult(() => runDoctor(options));
}

export async function validate(options: ValidateOptions = {}): Promise<RunResult> {
  return runWithResult(() => runValidate(options));
}

export async function introspect(options: IntrospectOptions = {}): Promise<RunResult> {
  return runWithResult(() => runIntrospect(options));
}

export async function importSchema(inputPath: string, options: ImportOptions = {}): Promise<RunResult> {
  return runWithResult(() => runImport(inputPath, options));
}
