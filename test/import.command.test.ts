import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runImport } from '../src/commands/import';
import { parseSchema } from '../src/core/parser';

describe('runImport', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemaforge-import-'));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('imports from a single sql file into schemaforge/schema.sf', async () => {
    const migrationPath = path.join(tempDir, 'single.sql');
    await fs.writeFile(
      migrationPath,
      `
        CREATE TABLE public.users (
          id uuid PRIMARY KEY,
          email text UNIQUE
        );
        ALTER TABLE public.users ALTER COLUMN email SET NOT NULL;
      `,
      'utf-8'
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

    await runImport(migrationPath);

    logSpy.mockRestore();
    warnSpy.mockRestore();

    const schemaPath = path.join(tempDir, 'schemaforge', 'schema.sf');
    const schemaSource = await fs.readFile(schemaPath, 'utf-8');
    const parsed = parseSchema(schemaSource);

    expect(parsed.tables.users.columns.map(column => column.name)).toEqual(['id', 'email']);
    expect(parsed.tables.users.columns.find(column => column.name === 'email')?.nullable).toBe(false);
  });

  it('imports a directory in filename order and ignores unsupported statements with warnings', async () => {
    const migrationDir = path.join(tempDir, 'supabase', 'migrations');
    await fs.mkdir(migrationDir, { recursive: true });

    await fs.writeFile(
      path.join(migrationDir, '001_create_users.sql'),
      `
        CREATE TABLE public.users (
          id uuid PRIMARY KEY,
          email text
        );
      `,
      'utf-8'
    );

    await fs.writeFile(
      path.join(migrationDir, '002_alter_users.sql'),
      `
        ALTER TABLE public.users ADD COLUMN created_at timestamptz DEFAULT now();
        ALTER TABLE public.users ALTER COLUMN email TYPE varchar(255);
        CREATE INDEX idx_users_email ON public.users(email);
      `,
      'utf-8'
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

    await runImport(migrationDir);

    const warningOutput = warnSpy.mock.calls.map(call => String(call[0] ?? '')).join('\n');
    logSpy.mockRestore();
    warnSpy.mockRestore();

    expect(warningOutput).toContain('Ignored');

    const schemaPath = path.join(tempDir, 'schemaforge', 'schema.sf');
    const schemaSource = await fs.readFile(schemaPath, 'utf-8');
    const parsed = parseSchema(schemaSource);
    const users = parsed.tables.users;

    expect(users.columns.map(column => column.name)).toEqual(['id', 'email', 'created_at']);
    expect(users.columns.find(column => column.name === 'email')?.type).toBe('varchar(255)');
  });
});
