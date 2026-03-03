import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Readable, Writable } from 'stream';
import { confirmDestructiveOps } from '../src/utils/prompt';
import type { Finding } from '../src/domain';

describe('Prompt utility', () => {
  let originalCI: string | undefined;
  
  beforeEach(() => {
    originalCI = process.env.CI;
  });

  afterEach(() => {
    if (originalCI === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCI;
    }
    vi.restoreAllMocks();
  });

  function createMockStdin(inputs: string[]): Readable {
    const stdin = new Readable({
      read() {
        if (inputs.length > 0) {
          this.push(inputs.shift() + '\n');
        } else {
          this.push(null);
        }
      }
    });
    return stdin;
  }

  function createMockStdout(): Writable {
    return new Writable({
      write(chunk, encoding, callback) {
        callback();
      }
    });
  }

  const destructiveFinding: Finding = {
    severity: 'error',
    code: 'DROP_COLUMN',
    table: 'users',
    column: 'avatar_url',
    message: 'Column removed'
  };

  const warningFinding: Finding = {
    severity: 'warning',
    code: 'SET_NOT_NULL',
    table: 'posts',
    column: 'title',
    message: 'Column set to NOT NULL'
  };

  describe('confirmDestructiveOps', () => {
    it('returns true when user confirms with "yes"', async () => {
      const stdin = createMockStdin(['yes']);
      const stdout = createMockStdout();
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await confirmDestructiveOps([destructiveFinding], stdin, stdout);

      expect(result).toBe(true);
      consoleLogSpy.mockRestore();
    });

    it('returns true when user confirms with "y"', async () => {
      const stdin = createMockStdin(['y']);
      const stdout = createMockStdout();
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await confirmDestructiveOps([destructiveFinding], stdin, stdout);

      expect(result).toBe(true);
      consoleLogSpy.mockRestore();
    });

    it('returns false when user declines with "no"', async () => {
      const stdin = createMockStdin(['no']);
      const stdout = createMockStdout();
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await confirmDestructiveOps([destructiveFinding], stdin, stdout);

      expect(result).toBe(false);
      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('returns false when user declines with "n"', async () => {
      const stdin = createMockStdin(['n']);
      const stdout = createMockStdout();
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await confirmDestructiveOps([destructiveFinding], stdin, stdout);

      expect(result).toBe(false);
      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('re-prompts on invalid input then accepts valid input', async () => {
      const stdin = createMockStdin(['invalid', 'maybe', 'yes']);
      const stdout = createMockStdout();
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await confirmDestructiveOps([destructiveFinding], stdin, stdout);

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Please answer "yes" or "no"'));
      consoleLogSpy.mockRestore();
    });

    it('handles case-insensitive input', async () => {
      const stdin = createMockStdin(['YES']);
      const stdout = createMockStdout();
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await confirmDestructiveOps([destructiveFinding], stdin, stdout);

      expect(result).toBe(true);
      consoleLogSpy.mockRestore();
    });

    it('handles whitespace in input', async () => {
      const stdin = createMockStdin(['  yes  ']);
      const stdout = createMockStdout();
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await confirmDestructiveOps([destructiveFinding], stdin, stdout);

      expect(result).toBe(true);
      consoleLogSpy.mockRestore();
    });

    it('returns true for empty findings (no risky operations)', async () => {
      const result = await confirmDestructiveOps([]);

      expect(result).toBe(true);
    });

    it('prompts for WARNING level findings', async () => {
      const stdin = createMockStdin(['yes']);
      const stdout = createMockStdout();
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await confirmDestructiveOps([warningFinding], stdin, stdout);

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('WARNING OPERATIONS'));
      consoleLogSpy.mockRestore();
    });

    it('displays both DESTRUCTIVE and WARNING findings', async () => {
      const stdin = createMockStdin(['yes']);
      const stdout = createMockStdout();
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await confirmDestructiveOps([destructiveFinding, warningFinding], stdin, stdout);

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('DESTRUCTIVE OPERATIONS'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('WARNING OPERATIONS'));
      consoleLogSpy.mockRestore();
    });

    it('formats findings with type changes', async () => {
      const stdin = createMockStdin(['yes']);
      const stdout = createMockStdout();
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const finding: Finding = {
        severity: 'error',
        code: 'ALTER_COLUMN_TYPE',
        table: 'products',
        column: 'description',
        from: 'text',
        to: 'varchar(100)',
        message: 'Type changed'
      };

      const result = await confirmDestructiveOps([finding], stdin, stdout);

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('text → varchar(100)'));
      consoleLogSpy.mockRestore();
    });
  });

  describe('CI environment detection', () => {
    it('returns false immediately when CI=true', async () => {
      process.env.CI = 'true';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await confirmDestructiveOps([destructiveFinding]);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot run interactive prompts in CI environment')
      );
      consoleErrorSpy.mockRestore();
    });

    it('returns false when CONTINUOUS_INTEGRATION=true', async () => {
      process.env.CONTINUOUS_INTEGRATION = 'true';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await confirmDestructiveOps([destructiveFinding]);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot run interactive prompts in CI environment')
      );
      consoleErrorSpy.mockRestore();
      delete process.env.CONTINUOUS_INTEGRATION;
    });

    it('does not treat CI=false as CI environment', async () => {
      process.env.CI = 'false';
      const stdin = createMockStdin(['yes']);
      const stdout = createMockStdout();
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await confirmDestructiveOps([destructiveFinding], stdin, stdout);

      expect(result).toBe(true);
      consoleLogSpy.mockRestore();
    });

    it('suggests using --force flag in CI', async () => {
      process.env.CI = 'true';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await confirmDestructiveOps([destructiveFinding]);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Use --force flag to bypass safety checks')
      );
      consoleErrorSpy.mockRestore();
    });
  });
});
