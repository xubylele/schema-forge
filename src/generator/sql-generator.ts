import {
  Schema,
  SchemaTable,
  SchemaField,
  SchemaIndex,
  DatabaseType,
  SchemaDiff,
  TableDiff,
  FieldDiff,
} from '../core/types';

/**
 * SQL generator for SchemaForge
 * Generates SQL DDL statements from schemas
 */

export class SqlGenerator {
  private databaseType: DatabaseType;

  constructor(databaseType: DatabaseType = 'postgres') {
    this.databaseType = databaseType;
  }

  /**
   * Generate CREATE TABLE SQL statements for a schema
   */
  generateCreateTableSQL(schema: Schema): string {
    const statements: string[] = [];

    for (const table of schema.tables) {
      statements.push(this.generateCreateTable(table));

      // Generate index statements
      if (table.indexes) {
        for (const index of table.indexes) {
          statements.push(this.generateCreateIndex(table.name, index));
        }
      }
    }

    return statements.join('\n\n');
  }

  /**
   * Generate CREATE TABLE statement for a single table
   */
  private generateCreateTable(table: SchemaTable): string {
    const fields = table.fields.map(field => this.generateFieldDefinition(field));
    const constraints: string[] = [];

    // Add primary key constraint if any field is marked as unique and required
    const primaryKeyFields = table.fields.filter(f => f.unique && f.required);
    if (primaryKeyFields.length > 0) {
      constraints.push(`  PRIMARY KEY (${primaryKeyFields[0].name})`);
    }

    const allDefinitions = [...fields, ...constraints];

    return `CREATE TABLE ${this.quoteIdentifier(table.name)} (\n  ${allDefinitions.join(',\n  ')}\n);`;
  }

  /**
   * Generate field definition SQL
   */
  private generateFieldDefinition(field: SchemaField): string {
    const parts: string[] = [this.quoteIdentifier(field.name)];

    // Add data type
    parts.push(this.mapFieldType(field));

    // Add NOT NULL constraint
    if (field.required) {
      parts.push('NOT NULL');
    }

    // Add UNIQUE constraint
    if (field.unique && !field.required) {
      parts.push('UNIQUE');
    }

    // Add DEFAULT value
    if (field.default !== undefined) {
      parts.push(`DEFAULT ${this.formatDefaultValue(field.default, field.type)}`);
    }

    // Add foreign key reference
    if (field.references) {
      parts.push(
        `REFERENCES ${this.quoteIdentifier(field.references.table)}(${this.quoteIdentifier(field.references.field)})`
      );
    }

    return parts.join(' ');
  }

  /**
   * Map field type to SQL data type
   */
  private mapFieldType(field: SchemaField): string {
    switch (this.databaseType) {
      case 'postgres':
        return this.mapToPostgresType(field);
      case 'mysql':
        return this.mapToMySQLType(field);
      case 'sqlite':
        return this.mapToSQLiteType(field);
      default:
        throw new Error(`Unsupported database type: ${this.databaseType}`);
    }
  }

  /**
   * Map field type to PostgreSQL data type
   */
  private mapToPostgresType(field: SchemaField): string {
    switch (field.type) {
      case 'string':
        return field.length ? `VARCHAR(${field.length})` : 'TEXT';
      case 'text':
        return 'TEXT';
      case 'number':
        if (field.precision && field.scale) {
          return `NUMERIC(${field.precision}, ${field.scale})`;
        }
        return 'DOUBLE PRECISION';
      case 'integer':
        return 'INTEGER';
      case 'boolean':
        return 'BOOLEAN';
      case 'date':
        return 'DATE';
      case 'datetime':
        return 'TIMESTAMP';
      case 'uuid':
        return 'UUID';
      case 'json':
        return 'JSONB';
      case 'enum':
        // For enum, we'd typically create a custom type first, but for simplicity using VARCHAR with CHECK
        if (field.enumValues) {
          return `VARCHAR(50) CHECK (${this.quoteIdentifier(field.name)} IN (${field.enumValues.map(v => `'${v}'`).join(', ')}))`;
        }
        return 'VARCHAR(50)';
      default:
        return 'TEXT';
    }
  }

  /**
   * Map field type to MySQL data type
   */
  private mapToMySQLType(field: SchemaField): string {
    switch (field.type) {
      case 'string':
        return field.length ? `VARCHAR(${field.length})` : 'TEXT';
      case 'text':
        return 'TEXT';
      case 'number':
        if (field.precision && field.scale) {
          return `DECIMAL(${field.precision}, ${field.scale})`;
        }
        return 'DOUBLE';
      case 'integer':
        return 'INT';
      case 'boolean':
        return 'TINYINT(1)';
      case 'date':
        return 'DATE';
      case 'datetime':
        return 'DATETIME';
      case 'uuid':
        return 'CHAR(36)';
      case 'json':
        return 'JSON';
      case 'enum':
        if (field.enumValues) {
          return `ENUM(${field.enumValues.map(v => `'${v}'`).join(', ')})`;
        }
        return 'VARCHAR(50)';
      default:
        return 'TEXT';
    }
  }

  /**
   * Map field type to SQLite data type
   */
  private mapToSQLiteType(field: SchemaField): string {
    switch (field.type) {
      case 'string':
      case 'text':
      case 'uuid':
      case 'enum':
        return 'TEXT';
      case 'number':
        return 'REAL';
      case 'integer':
      case 'boolean':
        return 'INTEGER';
      case 'date':
      case 'datetime':
        return 'TEXT'; // SQLite stores dates as text or integer
      case 'json':
        return 'TEXT';
      default:
        return 'TEXT';
    }
  }

  /**
   * Format default value for SQL
   */
  private formatDefaultValue(value: any, fieldType: string): string {
    if (value === null) {
      return 'NULL';
    }

    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }

    if (typeof value === 'boolean') {
      if (this.databaseType === 'postgres') {
        return value ? 'TRUE' : 'FALSE';
      }
      return value ? '1' : '0';
    }

    return String(value);
  }

  /**
   * Generate CREATE INDEX statement
   */
  private generateCreateIndex(tableName: string, index: SchemaIndex): string {
    const unique = index.unique ? 'UNIQUE ' : '';
    const indexType = this.getIndexTypeClause(index.type);
    const fields = index.fields.map(f => this.quoteIdentifier(f)).join(', ');

    return `CREATE ${unique}INDEX ${this.quoteIdentifier(index.name)} ON ${this.quoteIdentifier(tableName)}${indexType} (${fields});`;
  }

  /**
   * Get index type clause (if supported)
   */
  private getIndexTypeClause(indexType?: string): string {
    if (!indexType || this.databaseType !== 'postgres') {
      return '';
    }
    return ` USING ${indexType.toUpperCase()}`;
  }

  /**
   * Generate migration SQL from schema diff
   */
  generateMigrationSQL(diff: SchemaDiff): string {
    const statements: string[] = [];

    // Generate DROP TABLE statements for removed tables
    for (const table of diff.tablesRemoved) {
      statements.push(`DROP TABLE IF EXISTS ${this.quoteIdentifier(table.name)};`);
    }

    // Generate CREATE TABLE statements for added tables
    for (const table of diff.tablesAdded) {
      statements.push(this.generateCreateTable(table));

      if (table.indexes) {
        for (const index of table.indexes) {
          statements.push(this.generateCreateIndex(table.name, index));
        }
      }
    }

    // Generate ALTER TABLE statements for modified tables
    for (const tableDiff of diff.tablesModified) {
      statements.push(...this.generateAlterTableStatements(tableDiff));
    }

    return statements.join('\n\n');
  }

  /**
   * Generate ALTER TABLE statements for table modifications
   */
  private generateAlterTableStatements(tableDiff: TableDiff): string[] {
    const statements: string[] = [];
    const tableName = this.quoteIdentifier(tableDiff.name);

    // Add new fields
    for (const field of tableDiff.fieldsAdded) {
      statements.push(
        `ALTER TABLE ${tableName} ADD COLUMN ${this.generateFieldDefinition(field)};`
      );
    }

    // Remove fields
    for (const field of tableDiff.fieldsRemoved) {
      statements.push(
        `ALTER TABLE ${tableName} DROP COLUMN ${this.quoteIdentifier(field.name)};`
      );
    }

    // Modify fields (this is database-specific and complex)
    for (const fieldDiff of tableDiff.fieldsModified) {
      statements.push(...this.generateAlterColumnStatements(tableName, fieldDiff));
    }

    // Drop indexes
    for (const index of tableDiff.indexesRemoved) {
      statements.push(`DROP INDEX IF EXISTS ${this.quoteIdentifier(index.name)};`);
    }

    // Create indexes
    for (const index of tableDiff.indexesAdded) {
      statements.push(this.generateCreateIndex(tableDiff.name, index));
    }

    return statements;
  }

  /**
   * Generate ALTER COLUMN statements (database-specific)
   */
  private generateAlterColumnStatements(tableName: string, fieldDiff: FieldDiff): string[] {
    const statements: string[] = [];
    const columnName = this.quoteIdentifier(fieldDiff.name);

    if (this.databaseType === 'postgres') {
      // PostgreSQL requires separate ALTER COLUMN statements for each change
      if (fieldDiff.oldField.type !== fieldDiff.newField.type) {
        const newType = this.mapFieldType(fieldDiff.newField);
        statements.push(
          `ALTER TABLE ${tableName} ALTER COLUMN ${columnName} TYPE ${newType};`
        );
      }

      if (fieldDiff.oldField.required !== fieldDiff.newField.required) {
        const constraint = fieldDiff.newField.required ? 'SET NOT NULL' : 'DROP NOT NULL';
        statements.push(
          `ALTER TABLE ${tableName} ALTER COLUMN ${columnName} ${constraint};`
        );
      }
    } else {
      // For MySQL and SQLite, use MODIFY or other database-specific syntax
      statements.push(
        `ALTER TABLE ${tableName} MODIFY COLUMN ${this.generateFieldDefinition(fieldDiff.newField)};`
      );
    }

    return statements;
  }

  /**
   * Quote identifier (table/column name) based on database type
   */
  private quoteIdentifier(identifier: string): string {
    switch (this.databaseType) {
      case 'postgres':
        return `"${identifier}"`;
      case 'mysql':
        return `\`${identifier}\``;
      case 'sqlite':
        return `"${identifier}"`;
      default:
        return identifier;
    }
  }

  /**
   * Set database type
   */
  setDatabaseType(databaseType: DatabaseType): void {
    this.databaseType = databaseType;
  }

  /**
   * Get current database type
   */
  getDatabaseType(): DatabaseType {
    return this.databaseType;
  }
}

export const createSqlGenerator = (databaseType: DatabaseType = 'postgres'): SqlGenerator => {
  return new SqlGenerator(databaseType);
};
