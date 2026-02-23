import { describe, expect, it } from 'vitest';
import { diffSchemas } from '../src/core/diff';
import { DatabaseSchema, StateFile } from '../src/types/types';

describe('diffSchemas', () => {
  it('should generate ordered create/add/drop operations', () => {
    const oldState: StateFile = {
      version: 1,
      tables: {
        alpha: {
          columns: {
            id: { type: 'uuid', primaryKey: true },
            legacy: { type: 'text' },
          },
        },
        beta: {
          columns: {
            id: { type: 'uuid', primaryKey: true },
            old_col: { type: 'text' },
            keep_col: { type: 'text' },
          },
        },
      },
    };

    const newSchema: DatabaseSchema = {
      tables: {
        beta: {
          name: 'beta',
          columns: [
            { name: 'id', type: 'uuid', primaryKey: true },
            { name: 'keep_col', type: 'text' },
            { name: 'new_col', type: 'int' },
          ],
        },
        gamma: {
          name: 'gamma',
          columns: [{ name: 'id', type: 'uuid', primaryKey: true }],
        },
      },
    };

    const result = diffSchemas(oldState, newSchema);

    expect(result.operations).toHaveLength(4);
    expect(result.operations[0]).toEqual({
      kind: 'create_table',
      table: newSchema.tables.gamma,
    });
    expect(result.operations[1]).toEqual({
      kind: 'add_column',
      tableName: 'beta',
      column: newSchema.tables.beta.columns[2],
    });
    expect(result.operations[2]).toEqual({
      kind: 'drop_column',
      tableName: 'beta',
      columnName: 'old_col',
    });
    expect(result.operations[3]).toEqual({
      kind: 'drop_table',
      tableName: 'alpha',
    });
  });

  it('should create table when old state is empty and new schema has users', () => {
    const oldState: StateFile = {
      version: 1,
      tables: {},
    };

    const newSchema: DatabaseSchema = {
      tables: {
        users: {
          name: 'users',
          columns: [
            { name: 'id', type: 'uuid', primaryKey: true },
            { name: 'email', type: 'varchar', unique: true },
            { name: 'name', type: 'text' },
          ],
        },
      },
    };

    const result = diffSchemas(oldState, newSchema);

    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toEqual({
      kind: 'create_table',
      table: newSchema.tables.users,
    });
  });

  it('should add column when users table exists without avatar but schema has it', () => {
    const oldState: StateFile = {
      version: 1,
      tables: {
        users: {
          columns: {
            id: { type: 'uuid', primaryKey: true },
            email: { type: 'varchar' },
            name: { type: 'text' },
          },
        },
      },
    };

    const newSchema: DatabaseSchema = {
      tables: {
        users: {
          name: 'users',
          columns: [
            { name: 'id', type: 'uuid', primaryKey: true },
            { name: 'email', type: 'varchar' },
            { name: 'name', type: 'text' },
            { name: 'avatar', type: 'varchar', nullable: true },
          ],
        },
      },
    };

    const result = diffSchemas(oldState, newSchema);

    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toEqual({
      kind: 'add_column',
      tableName: 'users',
      column: { name: 'avatar', type: 'varchar', nullable: true },
    });
  });
});
