import { Schema, SchemaTable, SchemaField, ValidationResult, ValidationError } from './types';

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
