import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runDiff } from '../src/commands/diff';
import { isSchemaValidationError } from '../src/domain';

describe('runDiff provider bridge', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemaforge-diff-'));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function writeProjectConfig(provider?: string): Promise<void> {
    const schemaForgeDir = path.join(tempDir, 'schemaforge');
    await fs.mkdir(schemaForgeDir, { recursive: true });

    await fs.writeFile(
      path.join(schemaForgeDir, 'schema.sf'),
      `table users {\n  id uuid pk\n}\n`,
      'utf-8'
    );

    const config: {
      outputDir: string;
      schemaFile: string;
      stateFile: string;
      provider?: string;
    } = {
      outputDir: 'migrations',
      schemaFile: 'schemaforge/schema.sf',
      stateFile: 'schemaforge/state.json',
    };

    if (provider) {
      config.provider = provider;
    }

    await fs.writeFile(
      path.join(schemaForgeDir, 'config.json'),
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  }

  it('forwards supabase provider from config to SQL generator', async () => {
    await writeProjectConfig('supabase');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runDiff();

    const sql = String(logSpy.mock.calls[0]?.[0] ?? '');
    logSpy.mockRestore();

    expect(sql).toContain('gen_random_uuid()');
  });

  it('defaults provider to postgres when provider is omitted', async () => {
    await writeProjectConfig();

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runDiff();

    const sql = String(logSpy.mock.calls[0]?.[0] ?? '');
    logSpy.mockRestore();

    expect(sql).not.toContain('gen_random_uuid()');
  });
});

describe('runDiff --safe flag', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemaforge-diff-safe-'));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function setupProject(schemaContent: string, stateContent: string): Promise<void> {
    const schemaForgeDir = path.join(tempDir, 'schemaforge');
    await fs.mkdir(schemaForgeDir, { recursive: true });

    await fs.writeFile(
      path.join(schemaForgeDir, 'schema.sf'),
      schemaContent,
      'utf-8'
    );

    await fs.writeFile(
      path.join(schemaForgeDir, 'state.json'),
      stateContent,
      'utf-8'
    );

    await fs.writeFile(
      path.join(schemaForgeDir, 'config.json'),
      JSON.stringify({
        schemaFile: 'schemaforge/schema.sf',
        stateFile: 'schemaforge/state.json',
      }, null, 2),
      'utf-8'
    );
  }

  it('throws error with --safe when dropping a table', async () => {
    await setupProject(
      'table posts {\n  id uuid pk\n}\n',
      JSON.stringify({
        version: 1,
        tables: {
          users: {
            columns: {
              id: { type: 'uuid', primaryKey: true },
            },
          },
          posts: {
            columns: {
              id: { type: 'uuid', primaryKey: true },
            },
          },
        },
      }, null, 2)
    );

    let error: Error | null = null;
    try {
      await runDiff({ safe: true });
    } catch (err) {
      error = err as Error;
    }

    expect(error).not.toBeNull();
    expect(await isSchemaValidationError(error)).toBe(true);
    expect(error?.message).toContain('Cannot proceed with --safe flag');
    expect(error?.message).toContain('DROP_TABLE');
    expect(error?.message).toContain('users');
  });

  it('throws error with --safe when dropping a column', async () => {
    await setupProject(
      'table users {\n  id uuid pk\n}\n',
      JSON.stringify({
        version: 1,
        tables: {
          users: {
            columns: {
              id: { type: 'uuid', primaryKey: true },
              email: { type: 'text' },
            },
          },
        },
      }, null, 2)
    );

    let error: Error | null = null;
    try {
      await runDiff({ safe: true });
    } catch (err) {
      error = err as Error;
    }

    expect(error).not.toBeNull();
    expect(await isSchemaValidationError(error)).toBe(true);
    expect(error?.message).toContain('Cannot proceed with --safe flag');
    expect(error?.message).toContain('DROP_COLUMN');
    expect(error?.message).toContain('users.email');
  });

  it('throws error with --safe when changing column type destructively', async () => {
    await setupProject(
      'table users {\n  id uuid pk\n  age int\n}\n',
      JSON.stringify({
        version: 1,
        tables: {
          users: {
            columns: {
              id: { type: 'uuid', primaryKey: true },
              age: { type: 'bigint' },
            },
          },
        },
      }, null, 2)
    );

    let error: Error | null = null;
    try {
      await runDiff({ safe: true });
    } catch (err) {
      error = err as Error;
    }

    expect(error).not.toBeNull();
    expect(await isSchemaValidationError(error)).toBe(true);
    expect(error?.message).toContain('Cannot proceed with --safe flag');
    expect(error?.message).toContain('ALTER_COLUMN_TYPE');
  });

  it('succeeds with --safe when only adding columns', async () => {
    await setupProject(
      'table users {\n  id uuid pk\n  email text\n}\n',
      JSON.stringify({
        version: 1,
        tables: {
          users: {
            columns: {
              id: { type: 'uuid', primaryKey: true },
            },
          },
        },
      }, null, 2)
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runDiff({ safe: true });

    const sql = String(logSpy.mock.calls[0]?.[0] ?? '');
    logSpy.mockRestore();

    expect(sql).toContain('ALTER TABLE users ADD COLUMN email text;');
  });

  it('succeeds with --safe when changing column type safely (int to bigint)', async () => {
    await setupProject(
      'table users {\n  id uuid pk\n  age bigint\n}\n',
      JSON.stringify({
        version: 1,
        tables: {
          users: {
            columns: {
              id: { type: 'uuid', primaryKey: true },
              age: { type: 'int' },
            },
          },
        },
      }, null, 2)
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runDiff({ safe: true });

    const sql = String(logSpy.mock.calls[0]?.[0] ?? '');
    logSpy.mockRestore();

    expect(sql).toContain('ALTER TABLE users ALTER COLUMN age TYPE bigint');
  });

  it('succeeds without --safe when dropping a table', async () => {
    await setupProject(
      'table posts {\n  id uuid pk\n}\n',
      JSON.stringify({
        version: 1,
        tables: {
          users: {
            columns: {
              id: { type: 'uuid', primaryKey: true },
            },
          },
          posts: {
            columns: {
              id: { type: 'uuid', primaryKey: true },
            },
          },
        },
      }, null, 2)
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runDiff({ safe: false });

    const sql = String(logSpy.mock.calls[0]?.[0] ?? '');
    logSpy.mockRestore();

    expect(sql).toContain('DROP TABLE users');
  });

  it('succeeds with --force when dropping a table', async () => {
    await setupProject(
      'table posts {\n  id uuid pk\n}\n',
      JSON.stringify({
        version: 1,
        tables: {
          users: {
            columns: {
              id: { type: 'uuid', primaryKey: true },
            },
          },
          posts: {
            columns: {
              id: { type: 'uuid', primaryKey: true },
            },
          },
        },
      }, null, 2)
    );

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runDiff({ force: true });

    const sql = String(logSpy.mock.calls[0]?.[0] ?? '');
    const errorOutput = errorSpy.mock.calls.map(call => String(call[0])).join('\n');

    errorSpy.mockRestore();
    logSpy.mockRestore();

    expect(errorOutput).toContain('[FORCE]');
    expect(errorOutput).toContain('bypass safety checks');
    expect(sql).toContain('DROP TABLE users');
  });

  it('logs force warning when --force is used', async () => {
    await setupProject(
      'table users {\n  id uuid pk\n  email text\n}\n',
      JSON.stringify({
        version: 1,
        tables: {
          users: {
            columns: {
              id: { type: 'uuid', primaryKey: true },
            },
          },
        },
      }, null, 2)
    );

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    await runDiff({ force: true });

    const errorOutput = errorSpy.mock.calls.map(call => String(call[0])).join('\n');
    errorSpy.mockRestore();

    expect(errorOutput).toContain('[FORCE]');
    expect(errorOutput).toContain('Are you sure to use --force');
  });
});
