import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runConfig } from '../src/commands/config';

describe('runConfig', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemaforge-config-'));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('throws when project is not initialized', async () => {
    await expect(runConfig({ migrationFormat: 'hyphen' })).rejects.toThrow(
      'SchemaForge project not initialized. Run "schema-forge init" first.'
    );
  });

  it('sets migrationFileNameFormat to hyphen and preserves other config', async () => {
    const schemaForgeDir = path.join(tempDir, 'schemaforge');
    await fs.mkdir(schemaForgeDir, { recursive: true });
    const configPath = path.join(schemaForgeDir, 'config.json');
    const initialConfig = {
      schemaFile: 'schemaforge/schema.sf',
      stateFile: 'schemaforge/state.json',
      outputDir: 'migrations',
      provider: 'postgres',
    };
    await fs.writeFile(configPath, JSON.stringify(initialConfig, null, 2), 'utf-8');

    await runConfig({ migrationFormat: 'hyphen' });

    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    expect(config.migrationFileNameFormat).toBe('hyphen');
    expect(config.schemaFile).toBe(initialConfig.schemaFile);
    expect(config.outputDir).toBe(initialConfig.outputDir);
  });

  it('sets migrationFileNameFormat to underscore', async () => {
    const schemaForgeDir = path.join(tempDir, 'schemaforge');
    await fs.mkdir(schemaForgeDir, { recursive: true });
    const configPath = path.join(schemaForgeDir, 'config.json');
    await fs.writeFile(
      configPath,
      JSON.stringify({
        schemaFile: 'schemaforge/schema.sf',
        stateFile: 'schemaforge/state.json',
        outputDir: 'migrations',
      }),
      'utf-8'
    );

    await runConfig({ migrationFormat: 'underscore' });

    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    expect(config.migrationFileNameFormat).toBe('underscore');
  });

  it('throws on invalid migration format', async () => {
    const schemaForgeDir = path.join(tempDir, 'schemaforge');
    await fs.mkdir(schemaForgeDir, { recursive: true });
    const configPath = path.join(schemaForgeDir, 'config.json');
    await fs.writeFile(configPath, JSON.stringify({ outputDir: 'migrations' }), 'utf-8');

    await expect(runConfig({ migrationFormat: 'invalid' as 'hyphen' })).rejects.toThrow(
      /Invalid migration format "invalid". Allowed: hyphen, underscore/
    );
  });

  it('normalizes format to lowercase', async () => {
    const schemaForgeDir = path.join(tempDir, 'schemaforge');
    await fs.mkdir(schemaForgeDir, { recursive: true });
    const configPath = path.join(schemaForgeDir, 'config.json');
    await fs.writeFile(configPath, JSON.stringify({ outputDir: 'migrations' }), 'utf-8');

    await runConfig({ migrationFormat: 'UNDERSCORE' as 'underscore' });

    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    expect(config.migrationFileNameFormat).toBe('underscore');
  });
});
