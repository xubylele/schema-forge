import {
  Column,
  DatabaseSchema,
  DiffResult,
  Operation,
  StateColumn,
  StateFile,
} from '../types/types';

/**
 * Extract table names from a stored state file.
 */
export function getTableNamesFromState(state: StateFile): Set<string> {
  return new Set(Object.keys(state.tables));
}

/**
 * Extract table names from a database schema.
 */
export function getTableNamesFromSchema(schema: DatabaseSchema): Set<string> {
  return new Set(Object.keys(schema.tables));
}

/**
 * Extract column names from a state table columns record.
 */
export function getColumnNamesFromState(
  stateColumns: Record<string, StateColumn>
): Set<string> {
  return new Set(Object.keys(stateColumns));
}

/**
 * Extract column names from a schema table columns array.
 */
export function getColumnNamesFromSchema(dbColumns: Column[]): Set<string> {
  return new Set(dbColumns.map(column => column.name));
}

function getSortedNames(names: Set<string>): string[] {
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

/**
 * Compare a persisted state and a new schema, generating ordered operations.
 */
export function diffSchemas(oldState: StateFile, newSchema: DatabaseSchema): DiffResult {
  const operations: Operation[] = [];

  const oldTableNames = getTableNamesFromState(oldState);
  const newTableNames = getTableNamesFromSchema(newSchema);

  const sortedNewTableNames = getSortedNames(newTableNames);
  const sortedOldTableNames = getSortedNames(oldTableNames);

  // Phase 1: create tables (A-Z)
  for (const tableName of sortedNewTableNames) {
    if (!oldTableNames.has(tableName)) {
      operations.push({
        kind: 'create_table',
        table: newSchema.tables[tableName],
      });
    }
  }

  const commonTableNames = sortedNewTableNames.filter(tableName =>
    oldTableNames.has(tableName)
  );

  // Phase 2: add columns in schema order
  for (const tableName of commonTableNames) {
    const newTable = newSchema.tables[tableName];
    const oldTable = oldState.tables[tableName];

    if (!newTable || !oldTable) {
      continue;
    }

    const oldColumnNames = getColumnNamesFromState(oldTable.columns);

    for (const column of newTable.columns) {
      if (!oldColumnNames.has(column.name)) {
        operations.push({
          kind: 'add_column',
          tableName,
          column,
        });
      }
    }
  }

  // Phase 3: drop columns in state key order
  for (const tableName of commonTableNames) {
    const newTable = newSchema.tables[tableName];
    const oldTable = oldState.tables[tableName];

    if (!newTable || !oldTable) {
      continue;
    }

    const newColumnNames = getColumnNamesFromSchema(newTable.columns);

    for (const columnName of Object.keys(oldTable.columns)) {
      if (!newColumnNames.has(columnName)) {
        operations.push({
          kind: 'drop_column',
          tableName,
          columnName,
        });
      }
    }
  }

  // Phase 4: drop tables (A-Z)
  for (const tableName of sortedOldTableNames) {
    if (!newTableNames.has(tableName)) {
      operations.push({
        kind: 'drop_table',
        tableName,
      });
    }
  }

  return { operations };
}
