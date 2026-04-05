import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runPlan } from '../src/commands/plan';
import { runPreview } from '../src/commands/preview';

describe('runPlan and runPreview', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemaforge-plan-'));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function setupProject(schemaContent: string, stateContent?: unknown): Promise<void> {
    const schemaForgeDir = path.join(tempDir, 'schemaforge');
    await fs.mkdir(schemaForgeDir, { recursive: true });

    await fs.writeFile(path.join(schemaForgeDir, 'schema.sf'), schemaContent, 'utf-8');
    await fs.writeFile(
      path.join(schemaForgeDir, 'config.json'),
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
      path.join(schemaForgeDir, 'state.json'),
      JSON.stringify(stateContent ?? { version: 1, tables: {} }, null, 2),
      'utf-8'
    );
  }

  it('prints human-readable migration plan lines', async () => {
    await setupProject('table users {\n  id uuid pk\n}\n');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runPlan({ force: true });

    const output = logSpy.mock.calls.map(call => String(call[0] ?? '')).join('\n');
    logSpy.mockRestore();

    expect(output).toContain('+ create table users');
  });

  it('includes index and view operations in plan output', async () => {
    await setupProject(
      [
        'table users {',
        '  id uuid pk',
        '  email text unique not null',
        '}',
        '',
        'index idx_users_email on users(email)',
        '',
        'view active_users as select id, email from users where email is not null',
        '',
      ].join('\n')
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runPlan({ force: true });

    const output = logSpy.mock.calls.map(call => String(call[0] ?? '')).join('\n');
    logSpy.mockRestore();

    expect(output).toContain('+ create index idx_users_email on users');
    expect(output).toContain('+ create view active_users');
  });

  it('preview command mirrors plan output', async () => {
    await setupProject('table projects {\n  id uuid pk\n}\n');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    await runPreview({ force: true });

    const output = logSpy.mock.calls.map(call => String(call[0] ?? '')).join('\n');
    logSpy.mockRestore();

    expect(output).toContain('+ create table projects');
  });
});