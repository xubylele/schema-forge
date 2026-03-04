import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runDiff } from '../src/commands/diff';
import { runIntrospect } from '../src/commands/introspect';
import { runValidate } from '../src/commands/validate';
import { EXIT_CODES } from '../src/utils/exitCodes';

type QueryResolver = (sql: string) => object[];

const executedSql: string[] = [];
let queryResolver: QueryResolver = () => [];

vi.mock('pg', () => {
  return {
    Client: class MockClient {
      async connect(): Promise<void> {}
      async end(): Promise<void> {}
      async query(sql: string): Promise<{ rows: object[] }> {
        executedSql.push(sql);
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

describe('PostgreSQL live integration', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'schemaforge-live-'));
    process.chdir(tempDir);
    executedSql.length = 0;
    queryResolver = () => [];
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
    process.exitCode = undefined;
  });

  it('introspect queries information_schema and returns normalized deterministic output', async () => {
    setIntrospectionRows({
      tables: [
        { table_schema: 'public', table_name: 'users' },
        { table_schema: 'public', table_name: 'accounts' },
      ],
      columns: [
        {
          table_schema: 'public',
          table_name: 'users',
          column_name: 'email',
          ordinal_position: 2,
          is_nullable: 'NO',
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

    await runIntrospect({ url: 'postgres://localhost/test', json: true });

    const output = String(logSpy.mock.calls[0]?.[0] ?? '');
    logSpy.mockRestore();
    const schema = JSON.parse(output) as {
      tables: Record<string, { columns: Array<{ name: string }>; primaryKey?: string | null }>;
    };

    expect(Object.keys(schema.tables)).toEqual(['accounts', 'users']);
    expect(schema.tables.users.columns.map(column => column.name)).toEqual(['id', 'email']);
    expect(schema.tables.users.primaryKey).toBe('id');
    expect(executedSql.some(sql => sql.includes('information_schema.tables'))).toBe(true);
    expect(executedSql.some(sql => sql.includes('information_schema.columns'))).toBe(true);
  });

  it('diff live mode computes changes against introspected DB instead of state file', async () => {
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
    await fs.writeFile(
      path.join(schemaForgeDir, 'schema.sf'),
      `table users {\n  id uuid pk not null\n  email varchar\n}\n`,
      'utf-8'
    );
    await fs.writeFile(
      path.join(schemaForgeDir, 'state.json'),
      JSON.stringify({ version: 1, tables: {} }, null, 2),
      'utf-8'
    );

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
        {
          table_schema: 'public',
          table_name: 'users',
          column_name: 'email',
          ordinal_position: 2,
          is_nullable: 'YES',
          data_type: 'character varying',
          udt_name: 'varchar',
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
    await runDiff({ url: 'postgres://localhost/test' });
    const output = logSpy.mock.calls.map(call => String(call[0] ?? '')).join('\n');
    logSpy.mockRestore();

    expect(output).toContain('No changes detected');
    expect(process.exitCode).toBe(EXIT_CODES.SUCCESS);
  });

  it('validate live mode returns drift report with deterministic ordering', async () => {
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
    await fs.writeFile(
      path.join(schemaForgeDir, 'schema.sf'),
      `table users {\n  id uuid pk\n  email varchar\n}\n`,
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
              },
            },
          },
        },
        null,
        2
      ),
      'utf-8'
    );

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
      constraints: [],
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runValidate({ url: 'postgres://localhost/test', json: true });
    const output = String(logSpy.mock.calls[0]?.[0] ?? '');
    logSpy.mockRestore();

    const report = JSON.parse(output) as {
      missingTables: string[];
      extraTables: string[];
      typeMismatches: Array<{ tableName: string; columnName: string; expectedType: string; actualType: string }>;
    };

    expect(report.missingTables).toEqual(['accounts']);
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
});
