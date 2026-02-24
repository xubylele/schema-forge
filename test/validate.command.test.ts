import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runValidate } from '../src/commands/validate';

describe('runValidate', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemaforge-validate-'));
    process.chdir(tempDir);
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.exitCode = undefined;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns exit code 0 when no destructive changes are detected', async () => {
    const schemaForgeDir = path.join(tempDir, 'schemaforge');

    await fs.mkdir(schemaForgeDir, { recursive: true });
    await fs.writeFile(
      path.join(schemaForgeDir, 'config.json'),
      JSON.stringify(
        {
          schemaFile: 'schemaforge/schema.sf',
          stateFile: 'schemaforge/state.json',
          outputDir: 'migrations',
        },
        null,
        2
      ),
      'utf-8'
    );
    await fs.writeFile(
      path.join(schemaForgeDir, 'state.json'),
      JSON.stringify(
        {
          version: 1,
          tables: {
            users: {
              columns: {
                id: { type: 'uuid', primaryKey: true },
                email: { type: 'varchar(120)' },
              },
            },
          },
        },
        null,
        2
      ),
      'utf-8'
    );
    await fs.writeFile(
      path.join(schemaForgeDir, 'schema.sf'),
      `table users {\n  id uuid pk\n  email varchar(255)\n}\n`,
      'utf-8'
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runValidate();

    logSpy.mockRestore();
    expect(process.exitCode).toBe(0);
  });

  it('returns exit code 1 when destructive changes are detected', async () => {
    const schemaForgeDir = path.join(tempDir, 'schemaforge');

    await fs.mkdir(schemaForgeDir, { recursive: true });
    await fs.writeFile(
      path.join(schemaForgeDir, 'config.json'),
      JSON.stringify(
        {
          schemaFile: 'schemaforge/schema.sf',
          stateFile: 'schemaforge/state.json',
          outputDir: 'migrations',
        },
        null,
        2
      ),
      'utf-8'
    );
    await fs.writeFile(
      path.join(schemaForgeDir, 'state.json'),
      JSON.stringify(
        {
          version: 1,
          tables: {
            users: {
              columns: {
                id: { type: 'uuid', primaryKey: true },
                avatar_url: { type: 'text' },
              },
            },
          },
        },
        null,
        2
      ),
      'utf-8'
    );
    await fs.writeFile(
      path.join(schemaForgeDir, 'schema.sf'),
      `table users {\n  id uuid pk\n}\n`,
      'utf-8'
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runValidate();

    logSpy.mockRestore();
    expect(process.exitCode).toBe(1);
  });

  it('outputs JSON report grouped by severity when --json is set', async () => {
    const schemaForgeDir = path.join(tempDir, 'schemaforge');

    await fs.mkdir(schemaForgeDir, { recursive: true });
    await fs.writeFile(
      path.join(schemaForgeDir, 'config.json'),
      JSON.stringify(
        {
          schemaFile: 'schemaforge/schema.sf',
          stateFile: 'schemaforge/state.json',
          outputDir: 'migrations',
        },
        null,
        2
      ),
      'utf-8'
    );
    await fs.writeFile(
      path.join(schemaForgeDir, 'state.json'),
      JSON.stringify(
        {
          version: 1,
          tables: {
            users: {
              columns: {
                id: { type: 'uuid', primaryKey: true },
                email: { type: 'text', nullable: true },
                avatar_url: { type: 'text' },
              },
            },
          },
        },
        null,
        2
      ),
      'utf-8'
    );
    await fs.writeFile(
      path.join(schemaForgeDir, 'schema.sf'),
      `table users {\n  id uuid pk\n  email text not null\n}\n`,
      'utf-8'
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runValidate({ json: true });

    const output = logSpy.mock.calls[0]?.[0];
    logSpy.mockRestore();

    expect(typeof output).toBe('string');
    const jsonOutput = JSON.parse(output as string) as {
      hasErrors: boolean;
      hasWarnings: boolean;
      errors: Array<{ code: string; table: string; column?: string; message: string }>;
      warnings: Array<{ code: string; table: string; column?: string; message: string }>;
    };

    expect(jsonOutput.hasErrors).toBe(true);
    expect(jsonOutput.hasWarnings).toBe(true);
    expect(jsonOutput.errors).toEqual([
      {
        code: 'DROP_COLUMN',
        table: 'users',
        column: 'avatar_url',
        message: 'Column removed',
      },
    ]);
    expect(jsonOutput.warnings).toContainEqual({
      code: 'SET_NOT_NULL',
      table: 'users',
      column: 'email',
      message: 'Column changed to NOT NULL (may fail if data contains NULLs)',
    });
    expect(process.exitCode).toBe(1);
  });
});
