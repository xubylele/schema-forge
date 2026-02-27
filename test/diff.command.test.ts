import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runDiff } from '../src/commands/diff';

describe('runDiff provider bridge', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemaforge-diff-'));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function writeProjectConfig(provider?: string): Promise<void> {
    const schemaForgeDir = path.join(tempDir, 'schemaforge');
    await fs.mkdir(schemaForgeDir, { recursive: true });

    await fs.writeFile(
      path.join(schemaForgeDir, 'schema.sf'),
      `table users {\n  id uuid pk\n}\n`,
      'utf-8'
    );

    const config: {
      outputDir: string;
      schemaFile: string;
      stateFile: string;
      provider?: string;
    } = {
      outputDir: 'migrations',
      schemaFile: 'schemaforge/schema.sf',
      stateFile: 'schemaforge/state.json',
    };

    if (provider) {
      config.provider = provider;
    }

    await fs.writeFile(
      path.join(schemaForgeDir, 'config.json'),
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  }

  it('forwards supabase provider from config to SQL generator', async () => {
    await writeProjectConfig('supabase');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runDiff();

    const sql = String(logSpy.mock.calls[0]?.[0] ?? '');
    logSpy.mockRestore();

    expect(sql).toContain('gen_random_uuid()');
  });

  it('defaults provider to postgres when provider is omitted', async () => {
    await writeProjectConfig();

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runDiff();

    const sql = String(logSpy.mock.calls[0]?.[0] ?? '');
    logSpy.mockRestore();

    expect(sql).not.toContain('gen_random_uuid()');
  });
});
