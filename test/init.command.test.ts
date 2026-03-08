import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runGenerate } from '../src/commands/generate';
import { runInit } from '../src/commands/init';

describe('runInit', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemaforge-init-'));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('defaults to postgres and creates migrations/ when provider is omitted', async () => {
    await runInit();

    const configPath = path.join(tempDir, 'schemaforge', 'config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    expect(config.provider).toBe('postgres');
    expect(config.outputDir).toBe('migrations');

    const migrationsDir = path.join(tempDir, 'migrations');
    await expect(fs.access(migrationsDir)).resolves.toBeUndefined();
  });

  it('creates supabase/migrations and sets config when provider is supabase and supabase/ does not exist', async () => {
    await runInit({ provider: 'supabase' });

    const configPath = path.join(tempDir, 'schemaforge', 'config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    expect(config.provider).toBe('supabase');
    expect(config.outputDir).toBe('supabase/migrations');

    const migrationsDir = path.join(tempDir, 'supabase', 'migrations');
    await expect(fs.access(migrationsDir)).resolves.toBeUndefined();
  });

  it('uses existing supabase/ and sets outputDir to supabase/migrations when provider is supabase', async () => {
    const supabaseDir = path.join(tempDir, 'supabase');
    await fs.mkdir(supabaseDir, { recursive: true });

    await runInit({ provider: 'supabase' });

    const configPath = path.join(tempDir, 'schemaforge', 'config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    expect(config.provider).toBe('supabase');
    expect(config.outputDir).toBe('supabase/migrations');

    const migrationsDir = path.join(tempDir, 'supabase', 'migrations');
    await expect(fs.access(migrationsDir)).resolves.toBeUndefined();
  });

  it('creates supabase/migrations when supabase/ exists but migrations subdir does not', async () => {
    const supabaseDir = path.join(tempDir, 'supabase');
    await fs.mkdir(supabaseDir, { recursive: true });
    // Do not create supabase/migrations

    await runInit({ provider: 'supabase' });

    const migrationsDir = path.join(tempDir, 'supabase', 'migrations');
    await expect(fs.access(migrationsDir)).resolves.toBeUndefined();
  });

  it('throws on invalid provider', async () => {
    await expect(runInit({ provider: 'mysql' })).rejects.toThrow(
      /Invalid provider "mysql". Allowed values: postgres, supabase/
    );
  });

  it('accepts postgres explicitly', async () => {
    await runInit({ provider: 'postgres' });

    const configPath = path.join(tempDir, 'schemaforge', 'config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    expect(config.provider).toBe('postgres');
    expect(config.outputDir).toBe('migrations');
  });

  it('generate writes to supabase/migrations after init with provider supabase', async () => {
    await runInit({ provider: 'supabase' });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runGenerate({ name: 'initial', force: true });
    logSpy.mockRestore();

    const migrationsDir = path.join(tempDir, 'supabase', 'migrations');
    const files = await fs.readdir(migrationsDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^\d{14}-initial\.sql$/);
  });
});
