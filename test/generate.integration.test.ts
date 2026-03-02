import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runGenerate } from '../src/commands/generate';
import { isSchemaValidationError } from '../src/domain';

async function readJson<T>(filePath: string): Promise<T> {
  const contents = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(contents) as T;
}

describe('runGenerate integration', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemaforge-'));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('creates a migration and updates state', async () => {
    const schemaForgeDir = path.join(tempDir, 'schemaforge');
    const outputDir = path.join(tempDir, 'migrations');

    await fs.mkdir(schemaForgeDir, { recursive: true });

    const schemaPath = path.join(schemaForgeDir, 'schema.sf');
    const configPath = path.join(schemaForgeDir, 'config.json');
    const statePath = path.join(schemaForgeDir, 'state.json');

    await fs.writeFile(
      schemaPath,
      `table users {\n  id uuid pk\n}\n`,
      'utf-8'
    );

    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          outputDir: 'migrations',
          schemaFile: 'schemaforge/schema.sf',
          stateFile: 'schemaforge/state.json',
        },
        null,
        2
      ),
      'utf-8'
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runGenerate({ name: 'My Migration' });

    logSpy.mockRestore();

    const migrationFiles = await fs.readdir(outputDir);
    expect(migrationFiles).toHaveLength(1);
    expect(migrationFiles[0]).toMatch(/^\d{14}-my-migration\.sql$/);

    const migrationContents = await fs.readFile(
      path.join(outputDir, migrationFiles[0]),
      'utf-8'
    );
    expect(migrationContents).toContain('CREATE TABLE users');

    const state = await readJson<{ tables: Record<string, unknown> }>(statePath);
    expect(state.tables).toHaveProperty('users');
  });

  it('creates ALTER COLUMN TYPE migration when a column type changes', async () => {
    const schemaForgeDir = path.join(tempDir, 'schemaforge');
    const outputDir = path.join(tempDir, 'migrations');

    await fs.mkdir(schemaForgeDir, { recursive: true });

    const schemaPath = path.join(schemaForgeDir, 'schema.sf');
    const configPath = path.join(schemaForgeDir, 'config.json');
    const statePath = path.join(schemaForgeDir, 'state.json');

    await fs.writeFile(
      schemaPath,
      `table users {\n  id uuid pk\n  email text\n}\n`,
      'utf-8'
    );

    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          outputDir: 'migrations',
          schemaFile: 'schemaforge/schema.sf',
          stateFile: 'schemaforge/state.json',
        },
        null,
        2
      ),
      'utf-8'
    );

    await fs.writeFile(
      statePath,
      JSON.stringify(
        {
          version: 1,
          tables: {
            users: {
              columns: {
                id: { type: 'uuid', primaryKey: true },
                email: { type: 'varchar' },
              },
            },
          },
        },
        null,
        2
      ),
      'utf-8'
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runGenerate({ name: 'Alter Email Type' });

    logSpy.mockRestore();

    const migrationFiles = await fs.readdir(outputDir);
    expect(migrationFiles).toHaveLength(1);

    const migrationContents = await fs.readFile(
      path.join(outputDir, migrationFiles[0]),
      'utf-8'
    );
    expect(migrationContents).toContain(
      'ALTER TABLE users ALTER COLUMN email TYPE text USING email::text;'
    );

    const state = await readJson<{
      tables: { users: { columns: { email: { type: string } } } };
    }>(statePath);
    expect(state.tables.users.columns.email.type).toBe('text');
  });

  it('creates ALTER COLUMN SET NOT NULL migration when column nullability changes', async () => {
    const schemaForgeDir = path.join(tempDir, 'schemaforge');
    const outputDir = path.join(tempDir, 'migrations');

    await fs.mkdir(schemaForgeDir, { recursive: true });

    const schemaPath = path.join(schemaForgeDir, 'schema.sf');
    const configPath = path.join(schemaForgeDir, 'config.json');
    const statePath = path.join(schemaForgeDir, 'state.json');

    await fs.writeFile(
      schemaPath,
      `table users {\n  id uuid pk\n  email text not null\n}\n`,
      'utf-8'
    );

    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          outputDir: 'migrations',
          schemaFile: 'schemaforge/schema.sf',
          stateFile: 'schemaforge/state.json',
        },
        null,
        2
      ),
      'utf-8'
    );

    await fs.writeFile(
      statePath,
      JSON.stringify(
        {
          version: 1,
          tables: {
            users: {
              columns: {
                id: { type: 'uuid', primaryKey: true, nullable: true },
                email: { type: 'text', nullable: true },
              },
            },
          },
        },
        null,
        2
      ),
      'utf-8'
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runGenerate({ name: 'Alter Email Nullability' });

    logSpy.mockRestore();

    const migrationFiles = await fs.readdir(outputDir);
    expect(migrationFiles).toHaveLength(1);

    const migrationContents = await fs.readFile(
      path.join(outputDir, migrationFiles[0]),
      'utf-8'
    );
    expect(migrationContents).toContain(
      'ALTER TABLE users ALTER COLUMN email SET NOT NULL;'
    );

    const state = await readJson<{
      tables: { users: { columns: { email: { nullable: boolean } } } };
    }>(statePath);
    expect(state.tables.users.columns.email.nullable).toBe(false);
  });

  it('creates ALTER COLUMN DROP NOT NULL migration when column nullability changes', async () => {
    const schemaForgeDir = path.join(tempDir, 'schemaforge');
    const outputDir = path.join(tempDir, 'migrations');

    await fs.mkdir(schemaForgeDir, { recursive: true });

    const schemaPath = path.join(schemaForgeDir, 'schema.sf');
    const configPath = path.join(schemaForgeDir, 'config.json');
    const statePath = path.join(schemaForgeDir, 'state.json');

    await fs.writeFile(
      schemaPath,
      `table users {\n  id uuid pk\n  email text\n}\n`,
      'utf-8'
    );

    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          outputDir: 'migrations',
          schemaFile: 'schemaforge/schema.sf',
          stateFile: 'schemaforge/state.json',
        },
        null,
        2
      ),
      'utf-8'
    );

    await fs.writeFile(
      statePath,
      JSON.stringify(
        {
          version: 1,
          tables: {
            users: {
              columns: {
                id: { type: 'uuid', primaryKey: true, nullable: true },
                email: { type: 'text', nullable: false },
              },
            },
          },
        },
        null,
        2
      ),
      'utf-8'
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runGenerate({ name: 'Alter Email Drop Not Null' });

    logSpy.mockRestore();

    const migrationFiles = await fs.readdir(outputDir);
    expect(migrationFiles).toHaveLength(1);

    const migrationContents = await fs.readFile(
      path.join(outputDir, migrationFiles[0]),
      'utf-8'
    );
    expect(migrationContents).toContain(
      'ALTER TABLE users ALTER COLUMN email DROP NOT NULL;'
    );

    const state = await readJson<{
      tables: { users: { columns: { email: { nullable: boolean } } } };
    }>(statePath);
    expect(state.tables.users.columns.email.nullable).toBe(true);
  });

  it('creates ALTER COLUMN DEFAULT migration when a default changes', async () => {
    const schemaForgeDir = path.join(tempDir, 'schemaforge');
    const outputDir = path.join(tempDir, 'migrations');

    await fs.mkdir(schemaForgeDir, { recursive: true });

    const schemaPath = path.join(schemaForgeDir, 'schema.sf');
    const configPath = path.join(schemaForgeDir, 'config.json');
    const statePath = path.join(schemaForgeDir, 'state.json');

    await fs.writeFile(
      schemaPath,
      `table users {\n  id uuid pk\n  created_at timestamptz default now()\n}\n`,
      'utf-8'
    );

    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          outputDir: 'migrations',
          schemaFile: 'schemaforge/schema.sf',
          stateFile: 'schemaforge/state.json',
        },
        null,
        2
      ),
      'utf-8'
    );

    await fs.writeFile(
      statePath,
      JSON.stringify(
        {
          version: 1,
          tables: {
            users: {
              columns: {
                id: { type: 'uuid', primaryKey: true },
                created_at: { type: 'timestamptz' },
              },
            },
          },
        },
        null,
        2
      ),
      'utf-8'
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runGenerate({ name: 'Set Default Created At' });

    logSpy.mockRestore();

    const migrationFiles = await fs.readdir(outputDir);
    expect(migrationFiles).toHaveLength(1);

    const migrationContents = await fs.readFile(
      path.join(outputDir, migrationFiles[0]),
      'utf-8'
    );
    expect(migrationContents).toContain(
      'ALTER TABLE users ALTER COLUMN created_at SET DEFAULT now();'
    );

    const state = await readJson<{
      tables: { users: { columns: { created_at: { default?: string } } } };
    }>(statePath);
    expect(state.tables.users.columns.created_at.default).toBe('now()');
  });

  it('forwards supabase provider from config to SQL generator', async () => {
    const schemaForgeDir = path.join(tempDir, 'schemaforge');
    const outputDir = path.join(tempDir, 'migrations');

    await fs.mkdir(schemaForgeDir, { recursive: true });

    const schemaPath = path.join(schemaForgeDir, 'schema.sf');
    const configPath = path.join(schemaForgeDir, 'config.json');

    await fs.writeFile(
      schemaPath,
      `table users {\n  id uuid pk\n}\n`,
      'utf-8'
    );

    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          provider: 'supabase',
          outputDir: 'migrations',
          schemaFile: 'schemaforge/schema.sf',
          stateFile: 'schemaforge/state.json',
        },
        null,
        2
      ),
      'utf-8'
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runGenerate({ name: 'Supabase Provider' });

    logSpy.mockRestore();

    const migrationFiles = await fs.readdir(outputDir);
    expect(migrationFiles).toHaveLength(1);

    const migrationContents = await fs.readFile(
      path.join(outputDir, migrationFiles[0]),
      'utf-8'
    );

    expect(migrationContents).toContain('gen_random_uuid()');
  });

  it('defaults provider to postgres when provider is omitted', async () => {
    const schemaForgeDir = path.join(tempDir, 'schemaforge');
    const outputDir = path.join(tempDir, 'migrations');

    await fs.mkdir(schemaForgeDir, { recursive: true });

    const schemaPath = path.join(schemaForgeDir, 'schema.sf');
    const configPath = path.join(schemaForgeDir, 'config.json');

    await fs.writeFile(
      schemaPath,
      `table users {\n  id uuid pk\n}\n`,
      'utf-8'
    );

    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          outputDir: 'migrations',
          schemaFile: 'schemaforge/schema.sf',
          stateFile: 'schemaforge/state.json',
        },
        null,
        2
      ),
      'utf-8'
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runGenerate({ name: 'Default Provider' });

    logSpy.mockRestore();

    const migrationFiles = await fs.readdir(outputDir);
    expect(migrationFiles).toHaveLength(1);

    const migrationContents = await fs.readFile(
      path.join(outputDir, migrationFiles[0]),
      'utf-8'
    );

    expect(migrationContents).not.toContain('gen_random_uuid()');
  });
});

describe('runGenerate --safe flag', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemaforge-generate-safe-'));
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
        outputDir: 'migrations',
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
      await runGenerate({ safe: true });
    } catch (err) {
      error = err as Error;
    }

    expect(error).not.toBeNull();
    expect(await isSchemaValidationError(error)).toBe(true);
    expect(error?.message).toContain('Cannot proceed with --safe flag');
    expect(error?.message).toContain('DROP_TABLE');
    expect(error?.message).toContain('users');

    // Verify no migration file was created
    const migrationDir = path.join(tempDir, 'migrations');
    const migrationDirExists = await fs.access(migrationDir).then(() => true).catch(() => false);
    expect(migrationDirExists).toBe(false);
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
      await runGenerate({ safe: true });
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
      await runGenerate({ safe: true });
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

    await runGenerate({ safe: true, name: 'add-email' });

    logSpy.mockRestore();

    const migrationDir = path.join(tempDir, 'migrations');
    const migrationFiles = await fs.readdir(migrationDir);
    expect(migrationFiles).toHaveLength(1);

    const migrationContents = await fs.readFile(
      path.join(migrationDir, migrationFiles[0]),
      'utf-8'
    );
    expect(migrationContents).toContain('ALTER TABLE users ADD COLUMN email text;');

    // Verify state was updated
    const statePath = path.join(tempDir, 'schemaforge', 'state.json');
    const state = await readJson<{ tables: { users: { columns: Record<string, unknown> } } }>(statePath);
    expect(state.tables.users.columns).toHaveProperty('email');
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

    await runGenerate({ safe: true, name: 'widen-age' });

    logSpy.mockRestore();

    const migrationDir = path.join(tempDir, 'migrations');
    const migrationFiles = await fs.readdir(migrationDir);
    expect(migrationFiles).toHaveLength(1);

    const migrationContents = await fs.readFile(
      path.join(migrationDir, migrationFiles[0]),
      'utf-8'
    );
    expect(migrationContents).toContain('ALTER TABLE users ALTER COLUMN age TYPE bigint');
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

    await runGenerate({ safe: false, name: 'drop-users' });

    logSpy.mockRestore();

    const migrationDir = path.join(tempDir, 'migrations');
    const migrationFiles = await fs.readdir(migrationDir);
    expect(migrationFiles).toHaveLength(1);

    const migrationContents = await fs.readFile(
      path.join(migrationDir, migrationFiles[0]),
      'utf-8'
    );
    expect(migrationContents).toContain('DROP TABLE users');
  });

  it('does not check safe mode when there are no changes', async () => {
    await setupProject(
      'table users {\n  id uuid pk\n}\n',
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

    await runGenerate({ safe: true });

    logSpy.mockRestore();

    // Should not error even with safe flag since no changes
    const migrationDir = path.join(tempDir, 'migrations');
    const migrationDirExists = await fs.access(migrationDir).then(() => true).catch(() => false);
    expect(migrationDirExists).toBe(false);
  });

  it('succeeds with --force when dropping a table', async () => {
    const schemaV1 = `table users {\n  id uuid pk\n}\ntable posts {\n  id uuid pk\n}\n`;
    const schemaV2 = `table posts {\n  id uuid pk\n}\n`;

    // Initial setup with both tables
    await setupProject(schemaV1, JSON.stringify({
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
    }, null, 2));

    // Now update schema to drop the users table
    const schemaPath = path.join(tempDir, 'schemaforge', 'schema.sf');
    await fs.writeFile(schemaPath, schemaV2, 'utf-8');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runGenerate({ force: true });

    const errorOutput = errorSpy.mock.calls.map(call => String(call[0])).join('\n');

    errorSpy.mockRestore();
    infoSpy.mockRestore();

    expect(errorOutput).toContain('[FORCE]');
    expect(errorOutput).toContain('bypass safety checks');

    const migrationDir = path.join(tempDir, 'migrations');
    const migrationFiles = await fs.readdir(migrationDir);
    expect(migrationFiles.length).toBeGreaterThan(0);
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
    const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runGenerate({ force: true });

    const errorOutput = errorSpy.mock.calls.map(call => String(call[0])).join('\n');
    errorSpy.mockRestore();
    infoSpy.mockRestore();

    expect(errorOutput).toContain('[FORCE]');
    expect(errorOutput).toContain('Are you sure to use --force');
  });
});
