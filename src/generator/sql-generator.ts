import { Column, DiffResult, Operation, Table } from '../types/types';

export type Provider = 'supabase' | 'postgres';

export interface SqlConfig {
  uuidDefault?: string;
  timestampDefault?: string;
}

export function generateSql(
  diff: DiffResult,
  provider: Provider,
  sqlConfig?: SqlConfig
): string {
  const statements: string[] = [];

  for (const operation of diff.operations) {
    const sql = generateOperation(operation, provider, sqlConfig);
    if (sql) {
      statements.push(sql);
    }
  }

  return statements.join('\n\n');
}

function generateOperation(
  operation: Operation,
  provider: Provider,
  sqlConfig?: SqlConfig
): string {
  switch (operation.kind) {
    case 'create_table':
      return generateCreateTable(operation.table, provider, sqlConfig);
    case 'drop_table':
      return generateDropTable(operation.tableName);
    case 'add_column':
      return generateAddColumn(operation.tableName, operation.column, provider, sqlConfig);
    case 'drop_column':
      return generateDropColumn(operation.tableName, operation.columnName);
  }
}

function generateCreateTable(
  table: Table,
  provider: Provider,
  sqlConfig?: SqlConfig
): string {
  const columnDefs = table.columns.map(col =>
    generateColumnDefinition(col, provider, sqlConfig)
  );

  const lines = ['CREATE TABLE ' + table.name + ' ('];
  columnDefs.forEach((colDef, index) => {
    const isLast = index === columnDefs.length - 1;
    lines.push('  ' + colDef + (isLast ? '' : ','));
  });
  lines.push(');');

  return lines.join('\n');
}

function generateColumnDefinition(
  column: Column,
  provider: Provider,
  sqlConfig?: SqlConfig
): string {
  const parts: string[] = [column.name, column.type];

  // Foreign key inline
  if (column.foreignKey) {
    parts.push(
      `references ${column.foreignKey.table}(${column.foreignKey.column})`
    );
  }

  // Primary key
  if (column.primaryKey) {
    parts.push('primary key');
  }

  // Unique
  if (column.unique) {
    parts.push('unique');
  }

  // Nullable: si nullable es false, agregar NOT NULL
  // Si nullable es true o undefined, no agregar NOT NULL (permitir null)
  if (column.nullable === false) {
    parts.push('not null');
  }

  // Default
  if (column.default !== undefined) {
    parts.push('default ' + column.default);
  } else if (
    column.type === 'uuid' &&
    column.primaryKey &&
    provider === 'supabase'
  ) {
    parts.push('default gen_random_uuid()');
  }

  return parts.join(' ');
}

function generateDropTable(tableName: string): string {
  return `DROP TABLE ${tableName};`;
}

function generateAddColumn(
  tableName: string,
  column: Column,
  provider: Provider,
  sqlConfig?: SqlConfig
): string {
  const colDef = generateColumnDefinition(column, provider, sqlConfig);
  return `ALTER TABLE ${tableName} ADD COLUMN ${colDef};`;
}

function generateDropColumn(tableName: string, columnName: string): string {
  return `ALTER TABLE ${tableName} DROP COLUMN ${columnName};`;
}
