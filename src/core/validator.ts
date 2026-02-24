import {
  ColumnType,
  DatabaseSchema,
  Schema,
  SchemaField,
  SchemaTable,
  Table,
  ValidationError,
  ValidationResult
} from '../types/types';

/**
 * Schema validator for SchemaForge
 */

export class SchemaValidator {
  /**
   * Validate a complete schema
   */
  validateSchema(schema: Schema): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate schema structure
    if (!schema.version) {
      errors.push({
        path: 'schema.version',
        message: 'Schema version is required',
        severity: 'error',
      });
    }

    if (!schema.database) {
      errors.push({
        path: 'schema.database',
        message: 'Database type is required',
        severity: 'error',
      });
    }

    if (!schema.tables || schema.tables.length === 0) {
      errors.push({
        path: 'schema.tables',
        message: 'Schema must contain at least one table',
        severity: 'error',
      });
    }

    // Validate each table
    if (schema.tables) {
      const tableNames = new Set<string>();

      for (let i = 0; i < schema.tables.length; i++) {
        const table = schema.tables[i];
        const tableErrors = this.validateTable(table, i);
        errors.push(...tableErrors);

        // Check for duplicate table names
        if (tableNames.has(table.name)) {
          errors.push({
            path: `schema.tables[${i}].name`,
            message: `Duplicate table name: ${table.name}`,
            severity: 'error',
          });
        }
        tableNames.add(table.name);
      }

      // Validate foreign key references
      errors.push(...this.validateReferences(schema));
    }

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
    };
  }

  /**
   * Validate a table
   */
  private validateTable(table: SchemaTable, tableIndex: number): ValidationError[] {
    const errors: ValidationError[] = [];
    const basePath = `schema.tables[${tableIndex}]`;

    if (!table.name || table.name.trim() === '') {
      errors.push({
        path: `${basePath}.name`,
        message: 'Table name is required',
        severity: 'error',
      });
    }

    // Validate table name format
    if (table.name && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table.name)) {
      errors.push({
        path: `${basePath}.name`,
        message: `Invalid table name '${table.name}': must start with letter or underscore and contain only alphanumeric characters and underscores`,
        severity: 'error',
      });
    }

    if (!table.fields || table.fields.length === 0) {
      errors.push({
        path: `${basePath}.fields`,
        message: `Table '${table.name}' must have at least one field`,
        severity: 'error',
      });
    }

    // Validate fields
    if (table.fields) {
      const fieldNames = new Set<string>();

      for (let i = 0; i < table.fields.length; i++) {
        const field = table.fields[i];
        const fieldErrors = this.validateField(field, basePath, i);
        errors.push(...fieldErrors);

        // Check for duplicate field names
        if (fieldNames.has(field.name)) {
          errors.push({
            path: `${basePath}.fields[${i}].name`,
            message: `Duplicate field name: ${field.name}`,
            severity: 'error',
          });
        }
        fieldNames.add(field.name);
      }
    }

    return errors;
  }

  /**
   * Validate a field
   */
  private validateField(field: SchemaField, tablePath: string, fieldIndex: number): ValidationError[] {
    const errors: ValidationError[] = [];
    const basePath = `${tablePath}.fields[${fieldIndex}]`;

    if (!field.name || field.name.trim() === '') {
      errors.push({
        path: `${basePath}.name`,
        message: 'Field name is required',
        severity: 'error',
      });
    }

    // Validate field name format
    if (field.name && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.name)) {
      errors.push({
        path: `${basePath}.name`,
        message: `Invalid field name '${field.name}': must start with letter or underscore and contain only alphanumeric characters and underscores`,
        severity: 'error',
      });
    }

    if (!field.type) {
      errors.push({
        path: `${basePath}.type`,
        message: 'Field type is required',
        severity: 'error',
      });
    }

    // Validate enum values if type is enum
    if (field.type === 'enum') {
      if (!field.enumValues || field.enumValues.length === 0) {
        errors.push({
          path: `${basePath}.enumValues`,
          message: 'Enum type requires enumValues array',
          severity: 'error',
        });
      }
    }

    // Validate length for string types
    if (field.type === 'string' && field.length && field.length <= 0) {
      errors.push({
        path: `${basePath}.length`,
        message: 'String length must be greater than 0',
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Validate foreign key references
   */
  private validateReferences(schema: Schema): ValidationError[] {
    const errors: ValidationError[] = [];
    const tableNames = new Set(schema.tables.map(t => t.name));

    for (let i = 0; i < schema.tables.length; i++) {
      const table = schema.tables[i];

      for (let j = 0; j < table.fields.length; j++) {
        const field = table.fields[j];

        if (field.references) {
          const refTable = field.references.table;
          const refField = field.references.field;

          // Check if referenced table exists
          if (!tableNames.has(refTable)) {
            errors.push({
              path: `schema.tables[${i}].fields[${j}].references.table`,
              message: `Referenced table '${refTable}' does not exist`,
              severity: 'error',
            });
          } else {
            // Check if referenced field exists
            const referencedTable = schema.tables.find(t => t.name === refTable);
            if (referencedTable) {
              const referencedField = referencedTable.fields.find(f => f.name === refField);
              if (!referencedField) {
                errors.push({
                  path: `schema.tables[${i}].fields[${j}].references.field`,
                  message: `Referenced field '${refField}' does not exist in table '${refTable}'`,
                  severity: 'error',
                });
              }
            }
          }
        }
      }
    }

    return errors;
  }
}

export const defaultValidator = new SchemaValidator();

// ============================================================================
// DatabaseSchema Validation
// ============================================================================

/**
 * Valid column types for the database
 */
const VALID_BASE_COLUMN_TYPES: ColumnType[] = [
  'uuid',
  'varchar',
  'text',
  'int',
  'bigint',
  'boolean',
  'timestamptz',
  'date',
];

function isValidColumnType(type: string): boolean {
  const normalizedType = type
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*\)\s*/g, ')');

  if (VALID_BASE_COLUMN_TYPES.includes(normalizedType as ColumnType)) {
    return true;
  }

  return /^varchar\(\d+\)$/.test(normalizedType) || /^numeric\(\d+,\d+\)$/.test(normalizedType);
}

/**
 * Validates a DatabaseSchema structure and throws an Error when validations fail
 * 
 * Validations:
 * - Detects duplicate tables
 * - Detects duplicate columns within each table
 * - Detects multiple primary keys in a table
 * - Validates that column types are valid
 * - Validates that foreign keys reference existing tables and columns
 * 
 * @param schema - The DatabaseSchema to validate
 * @throws Error with a descriptive message if validation rules are violated
 */
export function validateSchema(schema: DatabaseSchema): void {
  validateDuplicateTables(schema);

  // Validate each table
  for (const tableName in schema.tables) {
    const table = schema.tables[tableName];
    validateTableColumns(tableName, table, schema.tables);
  }
}

/**
 * Validates that there are no duplicate tables in the schema
 * 
 * @param schema - The DatabaseSchema to validate
 * @throws Error if duplicate tables are detected
 */
function validateDuplicateTables(schema: DatabaseSchema): void {
  const tableNames = Object.keys(schema.tables);
  const seen = new Set<string>();

  for (const tableName of tableNames) {
    if (seen.has(tableName)) {
      throw new Error(`Duplicate table: '${tableName}'`);
    }
    seen.add(tableName);
  }
}

/**
 * Validates columns, primary keys, types, and foreign keys within a table
 * 
 * @param tableName - Table name
 * @param table - The table to validate
 * @param allTables - All schema tables (used to validate foreign keys)
 * @throws Error if validation violations are detected
 */
function validateTableColumns(tableName: string, table: Table, allTables: Record<string, Table>): void {
  // Validate duplicate columns
  const columnNames = new Set<string>();
  let primaryKeyCount = 0;

  for (const column of table.columns) {
    // Check for duplicate columns
    if (columnNames.has(column.name)) {
      throw new Error(`Table '${tableName}': duplicate column '${column.name}'`);
    }
    columnNames.add(column.name);

    // Count primary keys
    if (column.primaryKey) {
      primaryKeyCount++;
    }

    // Validate column type
    if (!isValidColumnType(column.type)) {
      throw new Error(
        `Table '${tableName}', column '${column.name}': type '${column.type}' is not valid. Supported types: ${VALID_BASE_COLUMN_TYPES.join(', ')}, varchar(n), numeric(p,s)`
      );
    }

    // Validate foreign key
    if (column.foreignKey) {
      const fkTable = column.foreignKey.table;
      const fkColumn = column.foreignKey.column;

      // Check that the referenced table exists
      if (!allTables[fkTable]) {
        throw new Error(
          `Table '${tableName}', column '${column.name}': referenced table '${fkTable}' does not exist`
        );
      }

      // Check that the column exists in the referenced table
      const referencedTable = allTables[fkTable];
      const columnExists = referencedTable.columns.some(col => col.name === fkColumn);

      if (!columnExists) {
        throw new Error(
          `Table '${tableName}', column '${column.name}': table '${fkTable}' does not have column '${fkColumn}'`
        );
      }
    }
  }

  // Validate multiple primary keys
  if (primaryKeyCount > 1) {
    throw new Error(`Table '${tableName}': can only have one primary key (found ${primaryKeyCount})`);
  }
}
