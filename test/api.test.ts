import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EXIT_CODES,
  generate,
  init,
  type RunResult,
} from '../src/api';

describe('Programmatic API', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemaforge-api-'));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('init', () => {
    it('returns success and creates schemaforge directory', async () => {
      const result = await init();
      expect(result).toMatchObject({ exitCode: EXIT_CODES.SUCCESS } satisfies RunResult);
      const schemaForgeDir = path.join(tempDir, 'schemaforge');
      await expect(fs.access(schemaForgeDir)).resolves.toBeUndefined();
      const configPath = path.join(schemaForgeDir, 'config.json');
      await expect(fs.readFile(configPath, 'utf-8')).resolves.toBeDefined();
    });

    it('does not leave process.exitCode set', async () => {
      const before = process.exitCode;
      await init();
      expect(process.exitCode).toBe(before);
    });
  });

  describe('generate', () => {
    let schemaForgeDir: string;

    beforeEach(async () => {
      schemaForgeDir = path.join(tempDir, 'schemaforge');
      await fs.mkdir(schemaForgeDir, { recursive: true });
      const configPath = path.join(schemaForgeDir, 'config.json');
      const schemaPath = path.join(schemaForgeDir, 'schema.sf');

      await fs.writeFile(
        schemaPath,
        'table users {\n  id uuid pk\n}\n',
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
      // Omit state.json so loadState returns empty state and generate creates initial migration
    });

    it('returns success and creates migration file', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = await generate({ name: 'Test' });
      logSpy.mockRestore();

      expect(result).toMatchObject({ exitCode: EXIT_CODES.SUCCESS } satisfies RunResult);
      const outputDir = path.join(tempDir, 'migrations');
      const migrationFiles = await fs.readdir(outputDir);
      expect(migrationFiles).toHaveLength(1);
      expect(migrationFiles[0]).toMatch(/^\d{14}-test\.sql$/);
    });

    it('returns VALIDATION_ERROR when both safe and force are used', async () => {
      const result = await generate({ safe: true, force: true });
      expect(result).toMatchObject({ exitCode: EXIT_CODES.VALIDATION_ERROR } satisfies RunResult);
    });

    it('does not leave process.exitCode set after validation error', async () => {
      const before = process.exitCode;
      await generate({ safe: true, force: true });
      expect(process.exitCode).toBe(before);
    });
  });
});
