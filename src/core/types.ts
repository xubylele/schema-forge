/**
 * Core type definitions for SchemaForge
 */

export type DatabaseType = 'postgres' | 'mysql' | 'sqlite';

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

export interface SchemaForgeConfig {
  version: string;
  database: DatabaseType;
  schemaDir: string;
  outputDir: string;
  migrationDir: string;
}
