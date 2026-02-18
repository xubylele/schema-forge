import { readJsonFile, findFiles } from './fs';
import { Schema, SchemaTable } from './types';

/**
 * Schema parser for SchemaForge
 */

export class SchemaParser {
  /**
   * Parse a schema from a JSON file
   */
  async parseSchemaFile(filePath: string): Promise<Schema> {
    try {
      const schema = await readJsonFile<Schema>(filePath, {} as Schema);
      return this.normalizeSchema(schema);
    } catch (error) {
      throw new Error(`Failed to parse schema file ${filePath}: ${error}`);
    }
  }

  /**
   * Parse multiple schema files from a directory
   */
  async parseSchemaDirectory(dirPath: string): Promise<Schema[]> {
    const schemaFiles = await findFiles(dirPath, /\.schema\.json$/);
    const schemas: Schema[] = [];

    for (const file of schemaFiles) {
      try {
        const schema = await this.parseSchemaFile(file);
        schemas.push(schema);
      } catch (error) {
        console.warn(`Warning: Could not parse ${file}:`, error);
      }
    }

    return schemas;
  }

  /**
   * Merge multiple schemas into one
   */
  mergeSchemas(schemas: Schema[]): Schema {
    if (schemas.length === 0) {
      throw new Error('Cannot merge empty schema array');
    }

    const baseSchema = schemas[0];
    const mergedTables: SchemaTable[] = [];

    // Collect all tables from all schemas
    for (const schema of schemas) {
      for (const table of schema.tables) {
        // Check if table already exists
        const existingIndex = mergedTables.findIndex(t => t.name === table.name);
        if (existingIndex >= 0) {
          console.warn(`Warning: Duplicate table '${table.name}' found, using first occurrence`);
        } else {
          mergedTables.push(table);
        }
      }
    }

    return {
      version: baseSchema.version,
      database: baseSchema.database,
      tables: mergedTables,
    };
  }

  /**
   * Normalize schema to ensure consistent structure
   */
  private normalizeSchema(schema: Schema): Schema {
    return {
      version: schema.version || '1.0.0',
      database: schema.database || 'postgres',
      tables: schema.tables.map(table => ({
        ...table,
        fields: table.fields.map(field => ({
          ...field,
          required: field.required ?? false,
          unique: field.unique ?? false,
        })),
        indexes: table.indexes || [],
        constraints: table.constraints || [],
      })),
    };
  }

  /**
   * Convert schema to JSON string
   */
  schemaToJson(schema: Schema, pretty: boolean = true): string {
    return pretty ? JSON.stringify(schema, null, 2) : JSON.stringify(schema);
  }

  /**
   * Parse schema from JSON string
   */
  parseSchemaString(jsonString: string): Schema {
    try {
      const schema = JSON.parse(jsonString);
      return this.normalizeSchema(schema);
    } catch (error) {
      throw new Error(`Failed to parse schema JSON: ${error}`);
    }
  }
}

export const defaultParser = new SchemaParser();
