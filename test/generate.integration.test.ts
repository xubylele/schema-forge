import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { runGenerate } from '../src/commands/generate';

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
});
