import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runDoctor } from '../src/commands/doctor';
import { EXIT_CODES } from '../src/utils/exitCodes';

type QueryResolver = (sql: string) => object[];

let queryResolver: QueryResolver = () => [];

vi.mock('pg', () => {
  return {
    Client: class MockClient {
      async connect(): Promise<void> {}
      async end(): Promise<void> {}
      async query(sql: string): Promise<{ rows: object[] }> {
        return { rows: queryResolver(sql) };
      }
    },
  };
});

function setIntrospectionRows(input: {
  tables: object[];
  columns: object[];
  constraints?: object[];
  foreignKeys?: object[];
}): void {
  queryResolver = (sql: string) => {
    if (sql.includes('FROM information_schema.tables')) {
      return input.tables;
    }
    if (sql.includes('FROM information_schema.columns')) {
      return input.columns;
    }
    if (sql.includes('FROM information_schema.table_constraints')) {
      return input.constraints ?? [];
    }
    if (sql.includes('FROM pg_constraint con')) {
      return input.foreignKeys ?? [];
    }
    return [];
  };
}

describe('runDoctor', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemaforge-doctor-'));
    process.chdir(tempDir);
    queryResolver = () => [];
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
    process.exitCode = undefined;
  });

  async function writeProjectFiles(state: object): Promise<void> {
    const schemaForgeDir = path.join(tempDir, 'schemaforge');
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
    await fs.writeFile(path.join(schemaForgeDir, 'schema.sf'), 'table users {\n  id uuid pk\n}\n', 'utf-8');
    await fs.writeFile(path.join(schemaForgeDir, 'state.json'), JSON.stringify(state, null, 2), 'utf-8');
  }

  it('returns exit code 0 when no drift is detected', async () => {
    await writeProjectFiles({
      version: 1,
      tables: {
        users: {
          columns: {
            id: { type: 'uuid', primaryKey: true },
          },
        },
      },
    });

    setIntrospectionRows({
      tables: [{ table_schema: 'public', table_name: 'users' }],
      columns: [
        {
          table_schema: 'public',
          table_name: 'users',
          column_name: 'id',
          ordinal_position: 1,
          is_nullable: 'NO',
          data_type: 'uuid',
          udt_name: 'uuid',
          character_maximum_length: null,
          numeric_precision: null,
          numeric_scale: null,
          column_default: null,
        },
      ],
      constraints: [
        {
          table_schema: 'public',
          table_name: 'users',
          constraint_name: 'users_pkey',
          constraint_type: 'PRIMARY KEY',
          column_name: 'id',
          ordinal_position: 1,
          check_clause: null,
        },
      ],
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runDoctor({ url: 'postgres://localhost/test' });
    logSpy.mockRestore();

    expect(process.exitCode).toBe(EXIT_CODES.SUCCESS);
  });

  it('returns exit code 2 when drift is detected', async () => {
    await writeProjectFiles({
      version: 1,
      tables: {
        users: {
          columns: {
            id: { type: 'uuid', primaryKey: true },
            email: { type: 'varchar' },
          },
        },
      },
    });

    setIntrospectionRows({
      tables: [{ table_schema: 'public', table_name: 'users' }],
      columns: [
        {
          table_schema: 'public',
          table_name: 'users',
          column_name: 'id',
          ordinal_position: 1,
          is_nullable: 'NO',
          data_type: 'uuid',
          udt_name: 'uuid',
          character_maximum_length: null,
          numeric_precision: null,
          numeric_scale: null,
          column_default: null,
        },
      ],
      constraints: [
        {
          table_schema: 'public',
          table_name: 'users',
          constraint_name: 'users_pkey',
          constraint_type: 'PRIMARY KEY',
          column_name: 'id',
          ordinal_position: 1,
          check_clause: null,
        },
      ],
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runDoctor({ url: 'postgres://localhost/test' });
    logSpy.mockRestore();

    expect(process.exitCode).toBe(EXIT_CODES.DRIFT_DETECTED);
  });

  it('outputs JSON drift report when --json is provided', async () => {
    await writeProjectFiles({
      version: 1,
      tables: {
        users: {
          columns: {
            id: { type: 'uuid', primaryKey: true },
            email: { type: 'varchar' },
          },
        },
      },
    });

    setIntrospectionRows({
      tables: [
        { table_schema: 'public', table_name: 'users' },
        { table_schema: 'public', table_name: 'audit' },
      ],
      columns: [
        {
          table_schema: 'public',
          table_name: 'users',
          column_name: 'id',
          ordinal_position: 1,
          is_nullable: 'NO',
          data_type: 'uuid',
          udt_name: 'uuid',
          character_maximum_length: null,
          numeric_precision: null,
          numeric_scale: null,
          column_default: null,
        },
        {
          table_schema: 'public',
          table_name: 'users',
          column_name: 'email',
          ordinal_position: 2,
          is_nullable: 'YES',
          data_type: 'text',
          udt_name: 'text',
          character_maximum_length: null,
          numeric_precision: null,
          numeric_scale: null,
          column_default: null,
        },
      ],
      constraints: [
        {
          table_schema: 'public',
          table_name: 'users',
          constraint_name: 'users_pkey',
          constraint_type: 'PRIMARY KEY',
          column_name: 'id',
          ordinal_position: 1,
          check_clause: null,
        },
      ],
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runDoctor({ url: 'postgres://localhost/test', json: true });

    const output = String(logSpy.mock.calls[0]?.[0] ?? '');
    logSpy.mockRestore();

    const report = JSON.parse(output) as {
      missingTables: string[];
      extraTables: string[];
      columnDifferences: Array<{ tableName: string; missingInLive: string[]; extraInLive: string[] }>;
      typeMismatches: Array<{ tableName: string; columnName: string; expectedType: string; actualType: string }>;
    };

    expect(report.extraTables).toEqual(['audit']);
    expect(report.typeMismatches).toEqual([
      {
        tableName: 'users',
        columnName: 'email',
        expectedType: 'varchar',
        actualType: 'text',
      },
    ]);
    expect(process.exitCode).toBe(EXIT_CODES.DRIFT_DETECTED);
  });

  it('prints human-readable drift details in non-json mode', async () => {
    await writeProjectFiles({
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
            nickname: { type: 'varchar' },
            email: { type: 'varchar' },
          },
        },
      },
    });

    setIntrospectionRows({
      tables: [
        { table_schema: 'public', table_name: 'users' },
        { table_schema: 'public', table_name: 'audit' },
      ],
      columns: [
        {
          table_schema: 'public',
          table_name: 'users',
          column_name: 'id',
          ordinal_position: 1,
          is_nullable: 'NO',
          data_type: 'uuid',
          udt_name: 'uuid',
          character_maximum_length: null,
          numeric_precision: null,
          numeric_scale: null,
          column_default: null,
        },
        {
          table_schema: 'public',
          table_name: 'users',
          column_name: 'email',
          ordinal_position: 2,
          is_nullable: 'YES',
          data_type: 'text',
          udt_name: 'text',
          character_maximum_length: null,
          numeric_precision: null,
          numeric_scale: null,
          column_default: null,
        },
        {
          table_schema: 'public',
          table_name: 'users',
          column_name: 'last_login',
          ordinal_position: 3,
          is_nullable: 'YES',
          data_type: 'timestamp without time zone',
          udt_name: 'timestamp',
          character_maximum_length: null,
          numeric_precision: null,
          numeric_scale: null,
          column_default: null,
        },
      ],
      constraints: [],
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runDoctor({ url: 'postgres://localhost/test' });
    const output = logSpy.mock.calls.map(call => String(call[0] ?? '')).join('\n');
    logSpy.mockRestore();

    expect(output).toContain('Schema drift detected');
    expect(output).toContain('Missing tables in live DB: accounts');
    expect(output).toContain('Extra tables in live DB: audit');
    expect(output).toContain('Missing columns in users: nickname');
    expect(output).toContain('Extra columns in users: last_login');
    expect(output).toContain('Type mismatch users.email: varchar -> text');
    expect(process.exitCode).toBe(EXIT_CODES.DRIFT_DETECTED);
  });
});
