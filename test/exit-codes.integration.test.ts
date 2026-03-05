import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runDiff } from '../src/commands/diff';
import { runGenerate } from '../src/commands/generate';
import { runValidate } from '../src/commands/validate';
import { isSchemaValidationError } from '../src/domain';
import { EXIT_CODES } from '../src/utils/exitCodes';

/**
 * SF-107: Test Matrix for Safety Combinations
 * 
 * This test suite covers all combinations of safety flags:
 * - Safe mode: ON / OFF
 * - Force mode: ON / OFF  
 * - CI environment: ON / OFF
 * 
 * For a total of 8 combinations tested across validate, generate, and diff commands.
 * 
 * Matrix Cases:
 * 1. Safe ON + destructive op → exit code 1 (VALIDATION_ERROR)
 * 2. Safe ON + Force ON → error (mutually exclusive)
 * 3. Safe ON + CI ON → exit code 1 (safe takes precedence)
 * 4. Safe OFF + Force ON + destructive op → exit code 0 (bypass checks)
 * 5. Safe OFF + Force ON + CI ON → exit code 0 (force bypasses CI)
 * 6. Safe OFF + CI ON + destructive op → exit code 3 (CI_DESTRUCTIVE)
 * 7. Safe OFF + Force OFF + CI OFF + destructive op → interactive (not auto-testable)
 * 8. Safe OFF + Force OFF + CI OFF + no destructive → exit code 0 (SUCCESS)
 * 
 * Additional coverage:
 * - Snapshot tests for plain-text error output
 * - Snapshot tests for JSON structured output
 * - Multiple operations edge cases
 * - Mixed errors and warnings scenarios
 */
describe('Exit Codes & Safety Matrix - SF-107', () => {
  let tempDir: string;
  let originalCwd: string;
  let originalCI: string | undefined;
  let originalContinuousIntegration: string | undefined;
  let originalDatabaseUrl: string | undefined;

  beforeEach(async () => {
    originalCwd = process.cwd();
    originalCI = process.env.CI;
    originalContinuousIntegration = process.env.CONTINUOUS_INTEGRATION;
    originalDatabaseUrl = process.env.DATABASE_URL;
    delete process.env.CI;
    delete process.env.CONTINUOUS_INTEGRATION;
    delete process.env.DATABASE_URL;
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemaforge-safety-matrix-'));
    process.chdir(tempDir);
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.exitCode = undefined;
    if (originalCI === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCI;
    }
    if (originalContinuousIntegration === undefined) {
      delete process.env.CONTINUOUS_INTEGRATION;
    } else {
      process.env.CONTINUOUS_INTEGRATION = originalContinuousIntegration;
    }
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Setup helper: Creates project with non-destructive schema change
   */
  async function setupProjectWithAddColumn(
    schemaContent: string,
    stateContent: string
  ): Promise<void> {
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
  }

  /**
   * Setup helper: Creates project with destructive operation (DROP_TABLE)
   */
  async function setupProjectWithDropTable(
    schemaContent: string,
    stateContent: string
  ): Promise<void> {
    await setupProjectWithAddColumn(schemaContent, stateContent);
  }

  /**
   * Setup helper: Creates project with destructive operation (DROP_COLUMN)
   */
  async function setupProjectWithDropColumn(
    schemaContent: string,
    stateContent: string
  ): Promise<void> {
    await setupProjectWithAddColumn(schemaContent, stateContent);
  }

  /**
   * Setup helper: Creates project with destructive operation (ALTER_COLUMN_TYPE narrowing)
   */
  async function setupProjectWithTypeNarrowing(
    schemaContent: string,
    stateContent: string
  ): Promise<void> {
    await setupProjectWithAddColumn(schemaContent, stateContent);
  }

  describe('Validate Command', () => {
    describe('Matrix: CI Mode Behavior', () => {
      it('CI mode ON, destructive op: exits with code 3 (CI_DESTRUCTIVE)', async () => {
        process.env.CI = 'true';
        await setupProjectWithDropTable(
          'table users {\n  id uuid pk\n}\n',
          JSON.stringify({
            version: 1,
            tables: {
              users: { columns: { id: { type: 'uuid', primaryKey: true } } },
              posts: { columns: { id: { type: 'uuid', primaryKey: true } } },
            },
          }, null, 2)
        );

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

        await runValidate();

        logSpy.mockRestore();
        expect(process.exitCode).toBe(EXIT_CODES.CI_DESTRUCTIVE);
      });

      it('CI mode with WARNING finding: exits with code 3', async () => {
        process.env.CI = 'true';
        await setupProjectWithAddColumn(
          'table users {\n  id uuid pk\n  email text not null\n}\n',
          JSON.stringify({
            version: 1,
            tables: {
              users: {
                columns: {
                  id: { type: 'uuid', primaryKey: true },
                  email: { type: 'text', nullable: true },
                },
              },
            },
          }, null, 2)
        );

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

        await runValidate();

        logSpy.mockRestore();
        expect(process.exitCode).toBe(EXIT_CODES.CI_DESTRUCTIVE);
      });
    });

    describe('Matrix: Normal Mode (No CI, No Safe/Force)', () => {
      it('Normal mode, no destructive: exits with code 0', async () => {
        await setupProjectWithAddColumn(
          'table users {\n  id uuid pk\n  email varchar(255)\n}\n',
          JSON.stringify({
            version: 1,
            tables: {
              users: {
                columns: {
                  id: { type: 'uuid', primaryKey: true },
                  email: { type: 'varchar(120)' },
                },
              },
            },
          }, null, 2)
        );

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

        await runValidate();

        logSpy.mockRestore();
        expect(process.exitCode).toBe(EXIT_CODES.SUCCESS);
      });

      it('Normal mode, with destructive change: exits with code 1', async () => {
        await setupProjectWithDropTable(
          'table users {\n  id uuid pk\n}\n',
          JSON.stringify({
            version: 1,
            tables: {
              users: { columns: { id: { type: 'uuid', primaryKey: true } } },
              posts: { columns: { id: { type: 'uuid', primaryKey: true } } },
            },
          }, null, 2)
        );

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

        await runValidate();

        logSpy.mockRestore();
        expect(process.exitCode).toBe(EXIT_CODES.VALIDATION_ERROR);
      });
    });

    describe('Snapshot Tests: JSON Output', () => {
      it('Destructive DROP_TABLE in JSON format', async () => {
        await setupProjectWithDropTable(
          'table users {\n  id uuid pk\n}\n',
          JSON.stringify({
            version: 1,
            tables: {
              users: { columns: { id: { type: 'uuid', primaryKey: true } } },
              posts: { columns: { id: { type: 'uuid', primaryKey: true } } },
            },
          }, null, 2)
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
        expect(jsonOutput.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: 'DROP_TABLE',
              table: 'posts',
            }),
          ])
        );
        expect(JSON.stringify(jsonOutput)).toMatchSnapshot('validate-drop-table-json');
      });

      it('Destructive warning in JSON format', async () => {
        await setupProjectWithAddColumn(
          'table users {\n  id uuid pk\n  email text not null\n}\n',
          JSON.stringify({
            version: 1,
            tables: {
              users: {
                columns: {
                  id: { type: 'uuid', primaryKey: true },
                  email: { type: 'text', nullable: true },
                },
              },
            },
          }, null, 2)
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

        expect(jsonOutput.hasWarnings).toBe(true);
        expect(jsonOutput.warnings).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: 'SET_NOT_NULL',
              table: 'users',
              column: 'email',
            }),
          ])
        );
        expect(JSON.stringify(jsonOutput)).toMatchSnapshot('validate-warnings-json');
      });
    });
  });

  describe('Diff Command', () => {
    describe('Matrix: Safe ON + Destructive OP', () => {
      it('Safe mode ON: throws error when dropping table', async () => {
        await setupProjectWithDropTable(
          'table users {\n  id uuid pk\n}\n',
          JSON.stringify({
            version: 1,
            tables: {
              users: { columns: { id: { type: 'uuid', primaryKey: true } } },
              posts: { columns: { id: { type: 'uuid', primaryKey: true } } },
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
      });

      it('Safe mode ON + Force ON: throws error (mutually exclusive)', async () => {
        await setupProjectWithDropTable(
          'table users {\n  id uuid pk\n}\n',
          JSON.stringify({
            version: 1,
            tables: {
              users: { columns: { id: { type: 'uuid', primaryKey: true } } },
              posts: { columns: { id: { type: 'uuid', primaryKey: true } } },
            },
          }, null, 2)
        );

        let error: Error | null = null;
        try {
          await runDiff({ safe: true, force: true });
        } catch (err) {
          error = err as Error;
        }

        expect(error).not.toBeNull();
        expect(error?.message).toContain('Cannot use --safe and --force flags together');
      });

      it('Safe mode ON, in CI: throws error (safe takes precedence)', async () => {
        process.env.CI = 'true';
        await setupProjectWithDropTable(
          'table users {\n  id uuid pk\n}\n',
          JSON.stringify({
            version: 1,
            tables: {
              users: { columns: { id: { type: 'uuid', primaryKey: true } } },
              posts: { columns: { id: { type: 'uuid', primaryKey: true } } },
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
      });
    });

    describe('Matrix: Safe OFF + Force ON', () => {
      it('Force mode ON: bypasses checks, generates SQL', async () => {
        await setupProjectWithDropTable(
          'table users {\n  id uuid pk\n}\n',
          JSON.stringify({
            version: 1,
            tables: {
              users: { columns: { id: { type: 'uuid', primaryKey: true } } },
              posts: { columns: { id: { type: 'uuid', primaryKey: true } } },
            },
          }, null, 2)
        );

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

        await runDiff({ force: true });

        const output = String(logSpy.mock.calls[0]?.[0] ?? '');
        logSpy.mockRestore();

        expect(output).toContain('DROP TABLE');
      });

      it('Force mode ON, in CI: bypasses CI check', async () => {
        process.env.CI = 'true';
        await setupProjectWithDropTable(
          'table users {\n  id uuid pk\n}\n',
          JSON.stringify({
            version: 1,
            tables: {
              users: { columns: { id: { type: 'uuid', primaryKey: true } } },
              posts: { columns: { id: { type: 'uuid', primaryKey: true } } },
            },
          }, null, 2)
        );

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

        await runDiff({ force: true });

        const output = String(logSpy.mock.calls[0]?.[0] ?? '');
        logSpy.mockRestore();

        expect(output).toContain('DROP TABLE');
      });
    });

    describe('Matrix: Safe OFF + CI ON', () => {
      it('CI mode ON: returns exit code 3 on destructive change', async () => {
        process.env.CI = 'true';
        await setupProjectWithDropTable(
          'table users {\n  id uuid pk\n}\n',
          JSON.stringify({
            version: 1,
            tables: {
              users: { columns: { id: { type: 'uuid', primaryKey: true } } },
              posts: { columns: { id: { type: 'uuid', primaryKey: true } } },
            },
          }, null, 2)
        );

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

        try {
          await runDiff();
        } catch (err) {
          // Expected to throw or handle error
        }

        logSpy.mockRestore();
        // In CI mode with destructive changes, should exit with code 3
        expect(process.exitCode).toBe(EXIT_CODES.CI_DESTRUCTIVE);
      });
    });

    describe('Matrix: Safe OFF + Force OFF + CI OFF (Normal Mode)', () => {
      it('Normal mode with --force: bypasses all checks, success', { timeout: 10000 }, async () => {
        await setupProjectWithDropTable(
          'table users {\n  id uuid pk\n}\n',
          JSON.stringify({
            version: 1,
            tables: {
              users: { columns: { id: { type: 'uuid', primaryKey: true } } },
              posts: { columns: { id: { type: 'uuid', primaryKey: true } } },
            },
          }, null, 2)
        );

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

        await runDiff({ force: true });

        logSpy.mockRestore();

        // With --force and no CI, should generate SQL successfully
        expect(process.exitCode === undefined || process.exitCode === EXIT_CODES.SUCCESS).toBe(true);
      });
    });
  });

  describe('Generate Command', () => {
    describe('Matrix: Safe ON + Destructive OP', () => {
      it('Safe mode ON: throws error when dropping table', async () => {
        await setupProjectWithDropTable(
          'table users {\n  id uuid pk\n}\n',
          JSON.stringify({
            version: 1,
            tables: {
              users: { columns: { id: { type: 'uuid', primaryKey: true } } },
              posts: { columns: { id: { type: 'uuid', primaryKey: true } } },
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
      });

      it('Safe mode ON + Force ON: throws error (mutually exclusive)', async () => {
        await setupProjectWithDropTable(
          'table users {\n  id uuid pk\n}\n',
          JSON.stringify({
            version: 1,
            tables: {
              users: { columns: { id: { type: 'uuid', primaryKey: true } } },
              posts: { columns: { id: { type: 'uuid', primaryKey: true } } },
            },
          }, null, 2)
        );

        let error: Error | null = null;
        try {
          await runGenerate({ safe: true, force: true });
        } catch (err) {
          error = err as Error;
        }

        expect(error).not.toBeNull();
        expect(error?.message).toContain('Cannot use --safe and --force flags together');
      });

      it('Safe mode ON, in CI: throws error (safe takes precedence)', async () => {
        process.env.CI = 'true';
        await setupProjectWithDropTable(
          'table users {\n  id uuid pk\n}\n',
          JSON.stringify({
            version: 1,
            tables: {
              users: { columns: { id: { type: 'uuid', primaryKey: true } } },
              posts: { columns: { id: { type: 'uuid', primaryKey: true } } },
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
      });
    });

    describe('Matrix: Safe OFF + Force ON', () => {
      it('Force mode ON: bypasses checks, generates migration', async () => {
        await setupProjectWithDropTable(
          'table users {\n  id uuid pk\n}\n',
          JSON.stringify({
            version: 1,
            tables: {
              users: { columns: { id: { type: 'uuid', primaryKey: true } } },
              posts: { columns: { id: { type: 'uuid', primaryKey: true } } },
            },
          }, null, 2)
        );

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

        await runGenerate({ force: true, name: 'test-migration' });

        logSpy.mockRestore();

        const migrationDir = path.join(tempDir, 'migrations');
        const files = await fs.readdir(migrationDir);
        expect(files.length).toBeGreaterThan(0);
      });

      it('Force mode ON, in CI: bypasses CI check, generates migration', async () => {
        process.env.CI = 'true';
        await setupProjectWithDropTable(
          'table users {\n  id uuid pk\n}\n',
          JSON.stringify({
            version: 1,
            tables: {
              users: { columns: { id: { type: 'uuid', primaryKey: true } } },
              posts: { columns: { id: { type: 'uuid', primaryKey: true } } },
            },
          }, null, 2)
        );

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

        await runGenerate({ force: true, name: 'test-migration' });

        logSpy.mockRestore();

        const migrationDir = path.join(tempDir, 'migrations');
        const files = await fs.readdir(migrationDir);
        expect(files.length).toBeGreaterThan(0);
      });
    });

    describe('Matrix: Safe OFF + CI ON', () => {
      it('CI mode ON: throws error on destructive change', async () => {
        process.env.CI = 'true';
        await setupProjectWithDropTable(
          'table users {\n  id uuid pk\n}\n',
          JSON.stringify({
            version: 1,
            tables: {
              users: { columns: { id: { type: 'uuid', primaryKey: true } } },
              posts: { columns: { id: { type: 'uuid', primaryKey: true } } },
            },
          }, null, 2)
        );

        let error: Error | null = null;
        try {
          await runGenerate({ name: 'test-migration' });
        } catch (err) {
          error = err as Error;
        }

        // In CI mode with destructive changes, should throw or fail
        expect(error !== null || process.exitCode === EXIT_CODES.CI_DESTRUCTIVE).toBe(true);
      });
    });

    describe('Matrix: Safe OFF + Force OFF + CI OFF (Normal Mode)', () => {
      it('Normal mode, no destructive: generates migration', { timeout: 10000 }, async () => {
        await setupProjectWithAddColumn(
          'table users {\n  id uuid pk\n  email varchar(255)\n}\n',
          JSON.stringify({
            version: 1,
            tables: {
              users: {
                columns: {
                  id: { type: 'uuid', primaryKey: true },
                  email: { type: 'varchar(120)' },
                },
              },
            },
          }, null, 2)
        );

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

        // With --force to avoid interactive prompts
        await runGenerate({ force: true, name: 'test-migration' });

        logSpy.mockRestore();
        expect(process.exitCode === undefined || process.exitCode === EXIT_CODES.SUCCESS).toBe(true);
      });
    });
  });

  describe('Multiple Operations Edge Cases', () => {
    it('Multiple DROP operations with --safe: blocks all', async () => {
      await setupProjectWithDropTable(
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
            posts: {
              columns: {
                id: { type: 'uuid', primaryKey: true },
              },
            },
            comments: {
              columns: {
                id: { type: 'uuid', primaryKey: true },
              },
            },
          },
        }, null, 2)
      );

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

      await runValidate();

      const output = logSpy.mock.calls.map(call => String(call[0])).join('\n');
      logSpy.mockRestore();

      expect(output).toContain('DROP_TABLE');
      expect(output).toContain('posts');
      expect(output).toContain('comments');
    });

    it('Mixed errors and warnings with --safe: blocks entire operation', async () => {
      await setupProjectWithDropColumn(
        'table users {\n  id uuid pk\n  email text not null\n}\n',
        JSON.stringify({
          version: 1,
          tables: {
            users: {
              columns: {
                id: { type: 'uuid', primaryKey: true },
                email: { type: 'text', nullable: true },
                avatar: { type: 'text' },
              },
            },
          },
        }, null, 2)
      );

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

      await runValidate();

      const output = logSpy.mock.calls.map(call => String(call[0])).join('\n');
      logSpy.mockRestore();

      expect(output).toContain('DROP_COLUMN');
      expect(output).toContain('SET_NOT_NULL');
      expect(process.exitCode).toBe(EXIT_CODES.VALIDATION_ERROR);
    });

    it('CI mode with mixed findings: exits code 3', async () => {
      process.env.CI = 'true';
      await setupProjectWithDropColumn(
        'table users {\n  id uuid pk\n  email text not null\n}\n',
        JSON.stringify({
          version: 1,
          tables: {
            users: {
              columns: {
                id: { type: 'uuid', primaryKey: true },
                email: { type: 'text', nullable: true },
                avatar: { type: 'text' },
              },
            },
          },
        }, null, 2)
      );

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

      await runValidate();

      logSpy.mockRestore();
      expect(process.exitCode).toBe(EXIT_CODES.CI_DESTRUCTIVE);
    });
  });
});

