import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runDiff } from '../src/commands/diff';
import { runGenerate } from '../src/commands/generate';
import { runPlan } from '../src/commands/plan';
import { runPreview } from '../src/commands/preview';

describe('CLI flag validation', () => {
  let tempDir: string;
  let originalCwd: string;
  let schemaForgeDir: string;
  let configPath: string;
  let schemaPath: string;
  let statePath: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemaforge-cli-'));
    process.chdir(tempDir);

    schemaForgeDir = path.join(tempDir, 'schemaforge');
    await fs.mkdir(schemaForgeDir, { recursive: true });

    configPath = path.join(schemaForgeDir, 'config.json');
    schemaPath = path.join(schemaForgeDir, 'schema.sf');
    statePath = path.join(schemaForgeDir, 'state.json');

    await fs.writeFile(
      schemaPath,
      'table users {\n  id uuid pk\n}\n',
      'utf-8'
    );

    const config = {
      outputDir: 'migrations',
      schemaFile: 'schemaforge/schema.sf',
      stateFile: 'schemaforge/state.json',
    };

    await fs.writeFile(
      configPath,
      JSON.stringify(config, null, 2),
      'utf-8'
    );

    const state = JSON.stringify({
      version: 1,
      tables: {
        users: {
          columns: {
            id: { type: 'uuid', primaryKey: true },
          },
        },
      },
    }, null, 2);

    await fs.writeFile(statePath, state, 'utf-8');
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('--force and --safe mutually exclusive', () => {
    it('throws error when both --force and --safe are used in diff', async () => {
      let error: Error | null = null;
      try {
        await runDiff({ force: true, safe: true });
      } catch (err) {
        error = err as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toContain('Cannot use --safe and --force flags together');
    });

    it('throws error when both --force and --safe are used in generate', async () => {
      let error: Error | null = null;
      try {
        await runGenerate({ force: true, safe: true });
      } catch (err) {
        error = err as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toContain('Cannot use --safe and --force flags together');
    });

    it('throws error when both --force and --safe are used in plan', async () => {
      let error: Error | null = null;
      try {
        await runPlan({ force: true, safe: true });
      } catch (err) {
        error = err as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toContain('Cannot use --safe and --force flags together');
    });

    it('throws error when both --force and --safe are used in preview', async () => {
      let error: Error | null = null;
      try {
        await runPreview({ force: true, safe: true });
      } catch (err) {
        error = err as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toContain('Cannot use --safe and --force flags together');
    });
  });

  describe('--force flag behavior', () => {
    it('diff accepts --force flag', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

      try {
        await runDiff({ force: true });
        expect(true).toBe(true); // Should not throw
      } catch (error) {
        expect(error).toBeNull(); // Should not reach here
      }

      errorSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('generate accepts --force flag', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
      const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

      try {
        await runGenerate({ force: true });
        expect(true).toBe(true); // Should not throw
      } catch (error) {
        expect(error).toBeNull(); // Should not reach here
      }

      errorSpy.mockRestore();
      infoSpy.mockRestore();
    });
  });
});
