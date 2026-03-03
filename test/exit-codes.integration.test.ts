import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runDiff } from '../src/commands/diff';
import { runGenerate } from '../src/commands/generate';
import { runValidate } from '../src/commands/validate';
import { EXIT_CODES } from '../src/utils/exitCodes';

/**
 * SF-106: Standardized Exit Codes Integration Tests
 *
 * Validates that all commands return consistent exit codes:
 * - 0: Success
 * - 1: Validation error (covered in other test files)
 * - 3: Unsafe destructive change in CI (covered in other test files)
 *
 * This file focuses on testing the consistency of exit code 0 across all commands
 * and verifying that code 3 is properly returned in CI with destructive changes.
 * Error scenarios (code 1) are covered by existing command and CLI tests.
 */
describe('Exit Code Standardization (SF-106)', () => {
  let tempDir: string;
  let originalCwd: string;
  let originalCI: string | undefined;

  beforeEach(async () => {
    originalCwd = process.cwd();
    originalCI = process.env.CI;
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemaforge-exit-codes-'));
    process.chdir(tempDir);
    process.exitCode = 0;
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
    if (originalCI === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCI;
    }
    process.exitCode = 0;
  });

  describe('Exit Code 0: Success', () => {
    let schemaForgeDir: string;

    beforeEach(async () => {
      schemaForgeDir = path.join(tempDir, 'schemaforge');
      await fs.mkdir(schemaForgeDir, { recursive: true });

      const config = {
        outputDir: 'migrations',
        schemaFile: 'schemaforge/schema.sf',
        stateFile: 'schemaforge/state.json',
      };

      await fs.writeFile(
        path.join(schemaForgeDir, 'config.json'),
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      await fs.writeFile(
        path.join(schemaForgeDir, 'schema.sf'),
        'table users {\n  id uuid pk\n  email text\n}\n',
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
                  email: { type: 'text' },
                },
              },
            },
          },
          null,
          2
        ),
        'utf-8'
      );
    });

    it('validate command returns exit code 0 for valid schema with no changes', async () => {
      process.exitCode = undefined;
      await runValidate({});
      expect(process.exitCode).toBe(EXIT_CODES.SUCCESS);
      expect(process.exitCode).toBe(0);
    });

    it('validate command returns exit code 0 for valid schema with only safe changes', async () => {
      // Add a column (safe change)
      await fs.writeFile(
        path.join(schemaForgeDir, 'schema.sf'),
        'table users {\n  id uuid pk\n  email text\n  name text\n}\n',
        'utf-8'
      );

      process.exitCode = undefined;
      await runValidate({});
      expect(process.exitCode).toBe(EXIT_CODES.SUCCESS);
      expect(process.exitCode).toBe(0);
    });

    it('generate command returns exit code 0 for valid schema with no changes', async () => {
      process.exitCode = undefined;
      vi.spyOn(console, 'log').mockImplementation(() => { });
      await runGenerate({});
      expect(process.exitCode).toBe(EXIT_CODES.SUCCESS);
      expect(process.exitCode).toBe(0);
    });

    it('generate command returns exit code 0 for valid schema with safe changes', async () => {
      // Add new column (safe change)
      await fs.writeFile(
        path.join(schemaForgeDir, 'schema.sf'),
        'table users {\n  id uuid pk\n  email text\n  name text\n}\n',
        'utf-8'
      );

      process.exitCode = undefined;
      vi.spyOn(console, 'log').mockImplementation(() => { });
      await runGenerate({});
      expect(process.exitCode).toBe(EXIT_CODES.SUCCESS);
      expect(process.exitCode).toBe(0);
    });

    it('diff command returns exit code 0 for no changes', async () => {
      process.exitCode = undefined;
      vi.spyOn(console, 'log').mockImplementation(() => { });
      await runDiff({});
      expect(process.exitCode).toBe(EXIT_CODES.SUCCESS);
      expect(process.exitCode).toBe(0);
    });

    it('diff command returns exit code 0 for safe changes', async () => {
      // Add new column to schema
      await fs.writeFile(
        path.join(schemaForgeDir, 'schema.sf'),
        'table users {\n  id uuid pk\n  email text\n  name text\n}\n',
        'utf-8'
      );

      process.exitCode = undefined;
      vi.spyOn(console, 'log').mockImplementation(() => { });
      await runDiff({});
      expect(process.exitCode).toBe(EXIT_CODES.SUCCESS);
      expect(process.exitCode).toBe(0);
    });
  });

  describe('Exit Code 3: Unsafe Destructive Change in CI', () => {
    it('validate command returns exit code 3 for destructive changes in CI', async () => {
      process.env.CI = 'true';

      const schemaForgeDir = path.join(tempDir, 'schemaforge');
      await fs.mkdir(schemaForgeDir, { recursive: true });

      const config = {
        outputDir: 'migrations',
        schemaFile: 'schemaforge/schema.sf',
        stateFile: 'schemaforge/state.json',
      };

      await fs.writeFile(
        path.join(schemaForgeDir, 'config.json'),
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // Original state with avatar_url column
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

      // Schema without avatar_url (dropping a column)
      await fs.writeFile(
        path.join(schemaForgeDir, 'schema.sf'),
        'table users {\n  id uuid pk\n}\n',
        'utf-8'
      );

      process.exitCode = undefined;
      await runValidate({});
      expect(process.exitCode).toBe(EXIT_CODES.CI_DESTRUCTIVE);
      expect(process.exitCode).toBe(3);
    });

    it('generate command returns exit code 3 for destructive changes in CI', async () => {
      process.env.CI = 'true';

      const schemaForgeDir = path.join(tempDir, 'schemaforge');
      await fs.mkdir(schemaForgeDir, { recursive: true });

      const config = {
        outputDir: 'migrations',
        schemaFile: 'schemaforge/schema.sf',
        stateFile: 'schemaforge/state.json',
      };

      await fs.writeFile(
        path.join(schemaForgeDir, 'config.json'),
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // Original state with avatar_url column
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

      // Schema without avatar_url (dropping a column)
      await fs.writeFile(
        path.join(schemaForgeDir, 'schema.sf'),
        'table users {\n  id uuid pk\n}\n',
        'utf-8'
      );

      process.exitCode = undefined;
      vi.spyOn(console, 'log').mockImplementation(() => { });

      try {
        await runGenerate({});
      } catch {
        // Expected to throw when user interaction is blocked in CI
      }

      expect(process.exitCode).toBe(EXIT_CODES.CI_DESTRUCTIVE);
      expect(process.exitCode).toBe(3);
    });

    it('diff command returns exit code 3 for destructive changes in CI', async () => {
      process.env.CI = 'true';

      const schemaForgeDir = path.join(tempDir, 'schemaforge');
      await fs.mkdir(schemaForgeDir, { recursive: true });

      const config = {
        outputDir: 'migrations',
        schemaFile: 'schemaforge/schema.sf',
        stateFile: 'schemaforge/state.json',
      };

      await fs.writeFile(
        path.join(schemaForgeDir, 'config.json'),
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // Original state with avatar_url column
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

      // Schema without avatar_url (dropping a column)
      await fs.writeFile(
        path.join(schemaForgeDir, 'schema.sf'),
        'table users {\n  id uuid pk\n}\n',
        'utf-8'
      );

      process.exitCode = undefined;
      vi.spyOn(console, 'log').mockImplementation(() => { });

      try {
        await runDiff({});
      } catch {
        // Expected to throw when user interaction is blocked in CI
      }

      expect(process.exitCode).toBe(EXIT_CODES.CI_DESTRUCTIVE);
      expect(process.exitCode).toBe(3);
    });
  });

  describe('Exit Code Consistency', () => {
    let schemaForgeDir: string;

    beforeEach(async () => {
      schemaForgeDir = path.join(tempDir, 'schemaforge');
      await fs.mkdir(schemaForgeDir, { recursive: true });

      const config = {
        outputDir: 'migrations',
        schemaFile: 'schemaforge/schema.sf',
        stateFile: 'schemaforge/state.json',
      };

      await fs.writeFile(
        path.join(schemaForgeDir, 'config.json'),
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      await fs.writeFile(
        path.join(schemaForgeDir, 'schema.sf'),
        'table users {\n  id uuid pk\n}\n',
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
                },
              },
            },
          },
          null,
          2
        ),
        'utf-8'
      );
    });

    it('all commands explicitly set exit code on success', async () => {
      process.exitCode = undefined;
      await runValidate({});
      expect(process.exitCode).toBeDefined();
      expect(process.exitCode).toBe(0);

      process.exitCode = undefined;
      vi.spyOn(console, 'log').mockImplementation(() => { });
      await runGenerate({});
      expect(process.exitCode).toBeDefined();
      expect(process.exitCode).toBe(0);

      process.exitCode = undefined;
      vi.spyOn(console, 'log').mockImplementation(() => { });
      await runDiff({});
      expect(process.exitCode).toBeDefined();
      expect(process.exitCode).toBe(0);
    });

    it('exit codes are always in valid range (0-3)', async () => {
      process.exitCode = undefined;
      await runValidate({});
      expect(typeof process.exitCode).toBe('number');
      expect(process.exitCode).toBeGreaterThanOrEqual(0);
      expect(process.exitCode).toBeLessThanOrEqual(3);
    });
  });
});
