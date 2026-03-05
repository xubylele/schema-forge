import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { runDoctor } from '../src/commands/doctor';
import { runValidate } from '../src/commands/validate';
import { EXIT_CODES } from '../src/utils/exitCodes';
import { createPostgresTestHarness, type PostgresTestHarness } from './helpers/postgres-test-harness';

interface DriftReport {
  missingTables: string[];
  extraTables: string[];
  columnDifferences: Array<{ tableName: string; missingInLive: string[]; extraInLive: string[] }>;
  typeMismatches: Array<{ tableName: string; columnName: string; expectedType: string; actualType: string }>;
}

const expectedReport: DriftReport = {
  missingTables: ['accounts'],
  extraTables: ['audit'],
  columnDifferences: [
    {
      tableName: 'users',
      missingInLive: ['nickname'],
      extraInLive: ['last_login'],
    },
  ],
  typeMismatches: [
    {
      tableName: 'users',
      columnName: 'email',
      expectedType: 'varchar',
      actualType: 'text',
    },
  ],
};

const hasCiServiceDatabase = process.env.SF_USE_CI_POSTGRES === 'true'
  && Boolean(process.env.DATABASE_URL?.trim());
const shouldRunWithTestcontainers = process.env.SF_RUN_REAL_DB_TESTS === 'true';
const shouldRunRealDbSuite = hasCiServiceDatabase || shouldRunWithTestcontainers;

describe.skipIf(!shouldRunRealDbSuite).sequential('Drift integration with real PostgreSQL', () => {
  let tempDir: string;
  let originalCwd: string;
  let harness: PostgresTestHarness | undefined;

  beforeAll(async () => {
    harness = await createPostgresTestHarness();
  }, 120000);

  afterAll(async () => {
    if (harness) {
      await harness.close();
    }
  });

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemaforge-drift-realdb-'));
    process.chdir(tempDir);
    await writeProjectFiles(tempDir);
    await harness!.resetPublicSchema();
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.exitCode = undefined;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('doctor --json returns deterministic drift report against real db', async () => {
    await setupVariantA(harness!);

    const report = await captureDriftReport(async () => {
      await runDoctor({ url: harness!.connectionString, json: true });
    });

    expect(report).toEqual(expectedReport);
    expect(process.exitCode).toBe(EXIT_CODES.DRIFT_DETECTED);
  });

  it('validate --url --json output is deterministic across different creation order', async () => {
    await setupVariantA(harness!);
    const reportA = await captureDriftReport(async () => {
      await runValidate({ url: harness!.connectionString, json: true });
    });
    expect(process.exitCode).toBe(EXIT_CODES.DRIFT_DETECTED);

    await harness!.resetPublicSchema();
    process.exitCode = undefined;
    await setupVariantB(harness!);
    const reportB = await captureDriftReport(async () => {
      await runValidate({ url: harness!.connectionString, json: true });
    });

    expect(reportA).toEqual(expectedReport);
    expect(reportB).toEqual(expectedReport);
    expect(reportB).toEqual(reportA);
    expect(process.exitCode).toBe(EXIT_CODES.DRIFT_DETECTED);
  });
});

async function writeProjectFiles(rootDir: string): Promise<void> {
  const schemaForgeDir = path.join(rootDir, 'schemaforge');
  await fs.mkdir(schemaForgeDir, { recursive: true });

  await fs.writeFile(
    path.join(schemaForgeDir, 'config.json'),
    JSON.stringify(
      {
        schemaFile: 'schemaforge/schema.sf',
        stateFile: 'schemaforge/state.json',
      },
      null,
      2
    ),
    'utf-8'
  );

  await fs.writeFile(
    path.join(schemaForgeDir, 'schema.sf'),
    'table users {\n  id uuid pk\n  email varchar\n  nickname varchar\n}\n',
    'utf-8'
  );

  await fs.writeFile(
    path.join(schemaForgeDir, 'state.json'),
    JSON.stringify(
      {
        version: 1,
        tables: {
          accounts: {
            columns: {
              id: { type: 'uuid', primaryKey: true },
            },
          },
          users: {
            columns: {
              id: { type: 'uuid', primaryKey: true },
              email: { type: 'varchar' },
              nickname: { type: 'varchar' },
            },
          },
        },
      },
      null,
      2
    ),
    'utf-8'
  );
}

async function setupVariantA(harness: PostgresTestHarness): Promise<void> {
  await harness.execute(
    [
      'CREATE TABLE audit (id uuid PRIMARY KEY);',
      'CREATE TABLE users (id uuid PRIMARY KEY, email text, last_login timestamp);',
    ].join('\n')
  );
}

async function setupVariantB(harness: PostgresTestHarness): Promise<void> {
  await harness.execute(
    [
      'CREATE TABLE users (last_login timestamp, email text, id uuid PRIMARY KEY);',
      'CREATE TABLE audit (id uuid PRIMARY KEY);',
    ].join('\n')
  );
}

async function captureDriftReport(run: () => Promise<void>): Promise<DriftReport> {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  try {
    await run();
    const output = String(logSpy.mock.calls[0]?.[0] ?? '');
    return JSON.parse(output) as DriftReport;
  } finally {
    logSpy.mockRestore();
  }
}
