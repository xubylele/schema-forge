/**
 * Core type definitions for SchemaForge
 */

// ============================================================================
// Column Types
// ============================================================================

export type ColumnType =
  | 'uuid'
  | 'varchar'
  | `varchar(${number})`
  | 'text'
  | 'int'
  | 'bigint'
  | `numeric(${number},${number})`
  | 'boolean'
  | 'timestamptz'
  | 'date';

// ============================================================================
// AST (Abstract Syntax Tree)
// ============================================================================

export interface ForeignKey {
  table: string;
  column: string;
}

export interface Column {
  name: string;
  type: ColumnType;
  primaryKey?: boolean;
  unique?: boolean;
  nullable?: boolean;
  default?: string;
  foreignKey?: ForeignKey;
}

export interface Table {
  name: string;
  columns: Column[];
}

export interface DatabaseSchema {
  tables: Record<string, Table>;
}

// ============================================================================
// State
// ============================================================================

export interface StateColumn {
  type: ColumnType;
  primaryKey?: boolean;
  unique?: boolean;
  nullable?: boolean;
  default?: string;
  foreignKey?: ForeignKey;
}

export interface StateTable {
  columns: Record<string, StateColumn>;
}

export interface StateFile {
  version: 1;
  tables: Record<string, StateTable>;
}

// ============================================================================
// Diff
// ============================================================================

export type Operation =
  | { kind: 'create_table'; table: Table }
  | { kind: 'drop_table'; tableName: string }
  | {
    kind: 'column_type_changed';
    tableName: string;
    columnName: string;
    fromType: ColumnType;
    toType: ColumnType;
  }
  | {
    kind: 'column_nullability_changed';
    tableName: string;
    columnName: string;
    from: boolean;
    to: boolean;
  }
  | { kind: 'add_column'; tableName: string; column: Column }
  | { kind: 'drop_column'; tableName: string; columnName: string };

export interface DiffResult {
  operations: Operation[];
}

// ============================================================================
// Legacy types (for compatibility with existing code)
// ============================================================================

export type DatabaseType = 'postgres' | 'mysql' | 'sqlite';

export interface SchemaForgeConfig {
  version: string;
  database: DatabaseType;
  schemaDir: string;
  outputDir: string;
  migrationDir: string;
}

export type FieldType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'text'
  | 'json'
  | 'uuid'
  | 'enum';

export interface SchemaField {
  name: string;
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  default?: any;
  length?: number;
  precision?: number;
  scale?: number;
  enumValues?: string[];
  references?: {
    table: string;
    field: string;
  };
}

export interface SchemaTable {
  name: string;
  fields: SchemaField[];
  indexes?: SchemaIndex[];
  constraints?: SchemaConstraint[];
}

export interface SchemaIndex {
  name: string;
  fields: string[];
  unique?: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface SchemaConstraint {
  name: string;
  type: 'primary_key' | 'foreign_key' | 'unique' | 'check';
  fields: string[];
  references?: {
    table: string;
    fields: string[];
  };
  expression?: string;
}

export interface Schema {
  version: string;
  database: DatabaseType;
  tables: SchemaTable[];
}

export interface SchemaDiff {
  tablesAdded: SchemaTable[];
  tablesRemoved: SchemaTable[];
  tablesModified: TableDiff[];
}

export interface TableDiff {
  name: string;
  fieldsAdded: SchemaField[];
  fieldsRemoved: SchemaField[];
  fieldsModified: FieldDiff[];
  indexesAdded: SchemaIndex[];
  indexesRemoved: SchemaIndex[];
}

export interface FieldDiff {
  name: string;
  oldField: SchemaField;
  newField: SchemaField;
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
