import {
  Schema,
  SchemaDiff,
  SchemaField,
  SchemaTable,
  TableDiff
} from './types';

/**
 * Schema diff calculator for SchemaForge
 */

export class SchemaDiffer {
  /**
   * Compare two schemas and generate a diff
   */
  diffSchemas(sourceSchema: Schema, targetSchema: Schema): SchemaDiff {
    const diff: SchemaDiff = {
      tablesAdded: [],
      tablesRemoved: [],
      tablesModified: [],
    };

    const sourceTableMap = new Map(sourceSchema.tables.map(t => [t.name, t]));
    const targetTableMap = new Map(targetSchema.tables.map(t => [t.name, t]));

    // Find added tables
    for (const [name, table] of targetTableMap) {
      if (!sourceTableMap.has(name)) {
        diff.tablesAdded.push(table);
      }
    }

    // Find removed tables
    for (const [name, table] of sourceTableMap) {
      if (!targetTableMap.has(name)) {
        diff.tablesRemoved.push(table);
      }
    }

    // Find modified tables
    for (const [name, sourceTable] of sourceTableMap) {
      const targetTable = targetTableMap.get(name);
      if (targetTable) {
        const tableDiff = this.diffTables(sourceTable, targetTable);
        if (this.hasTableChanges(tableDiff)) {
          diff.tablesModified.push(tableDiff);
        }
      }
    }

    return diff;
  }

  /**
   * Compare two tables and generate a diff
   */
  private diffTables(sourceTable: SchemaTable, targetTable: SchemaTable): TableDiff {
    const diff: TableDiff = {
      name: sourceTable.name,
      fieldsAdded: [],
      fieldsRemoved: [],
      fieldsModified: [],
      indexesAdded: [],
      indexesRemoved: [],
    };

    const sourceFieldMap = new Map(sourceTable.fields.map(f => [f.name, f]));
    const targetFieldMap = new Map(targetTable.fields.map(f => [f.name, f]));

    // Find added fields
    for (const [name, field] of targetFieldMap) {
      if (!sourceFieldMap.has(name)) {
        diff.fieldsAdded.push(field);
      }
    }

    // Find removed fields
    for (const [name, field] of sourceFieldMap) {
      if (!targetFieldMap.has(name)) {
        diff.fieldsRemoved.push(field);
      }
    }

    // Find modified fields
    for (const [name, sourceField] of sourceFieldMap) {
      const targetField = targetFieldMap.get(name);
      if (targetField && !this.areFieldsEqual(sourceField, targetField)) {
        diff.fieldsModified.push({
          name,
          oldField: sourceField,
          newField: targetField,
        });
      }
    }

    // Diff indexes
    const sourceIndexes = sourceTable.indexes || [];
    const targetIndexes = targetTable.indexes || [];

    const sourceIndexMap = new Map(sourceIndexes.map(i => [i.name, i]));
    const targetIndexMap = new Map(targetIndexes.map(i => [i.name, i]));

    // Find added indexes
    for (const [name, index] of targetIndexMap) {
      if (!sourceIndexMap.has(name)) {
        diff.indexesAdded.push(index);
      }
    }

    // Find removed indexes
    for (const [name, index] of sourceIndexMap) {
      if (!targetIndexMap.has(name)) {
        diff.indexesRemoved.push(index);
      }
    }

    return diff;
  }

  /**
   * Check if two fields are equal
   */
  private areFieldsEqual(field1: SchemaField, field2: SchemaField): boolean {
    return (
      field1.type === field2.type &&
      field1.required === field2.required &&
      field1.unique === field2.unique &&
      field1.length === field2.length &&
      field1.precision === field2.precision &&
      field1.scale === field2.scale &&
      JSON.stringify(field1.default) === JSON.stringify(field2.default) &&
      JSON.stringify(field1.enumValues) === JSON.stringify(field2.enumValues) &&
      JSON.stringify(field1.references) === JSON.stringify(field2.references)
    );
  }

  /**
   * Check if table diff has any changes
   */
  private hasTableChanges(tableDiff: TableDiff): boolean {
    return (
      tableDiff.fieldsAdded.length > 0 ||
      tableDiff.fieldsRemoved.length > 0 ||
      tableDiff.fieldsModified.length > 0 ||
      tableDiff.indexesAdded.length > 0 ||
      tableDiff.indexesRemoved.length > 0
    );
  }

  /**
   * Check if schema diff has any changes
   */
  hasDifferences(diff: SchemaDiff): boolean {
    return (
      diff.tablesAdded.length > 0 ||
      diff.tablesRemoved.length > 0 ||
      diff.tablesModified.length > 0
    );
  }

  /**
   * Generate a human-readable summary of the diff
   */
  generateDiffSummary(diff: SchemaDiff): string {
    const lines: string[] = [];

    if (diff.tablesAdded.length > 0) {
      lines.push(`\nTables Added (${diff.tablesAdded.length}):`);
      for (const table of diff.tablesAdded) {
        lines.push(`  + ${table.name}`);
      }
    }

    if (diff.tablesRemoved.length > 0) {
      lines.push(`\nTables Removed (${diff.tablesRemoved.length}):`);
      for (const table of diff.tablesRemoved) {
        lines.push(`  - ${table.name}`);
      }
    }

    if (diff.tablesModified.length > 0) {
      lines.push(`\nTables Modified (${diff.tablesModified.length}):`);
      for (const tableDiff of diff.tablesModified) {
        lines.push(`  ~ ${tableDiff.name}`);

        if (tableDiff.fieldsAdded.length > 0) {
          lines.push(`    Fields Added: ${tableDiff.fieldsAdded.map(f => f.name).join(', ')}`);
        }
        if (tableDiff.fieldsRemoved.length > 0) {
          lines.push(`    Fields Removed: ${tableDiff.fieldsRemoved.map(f => f.name).join(', ')}`);
        }
        if (tableDiff.fieldsModified.length > 0) {
          lines.push(`    Fields Modified: ${tableDiff.fieldsModified.map(f => f.name).join(', ')}`);
        }
        if (tableDiff.indexesAdded.length > 0) {
          lines.push(`    Indexes Added: ${tableDiff.indexesAdded.map(i => i.name).join(', ')}`);
        }
        if (tableDiff.indexesRemoved.length > 0) {
          lines.push(`    Indexes Removed: ${tableDiff.indexesRemoved.map(i => i.name).join(', ')}`);
        }
      }
    }

    if (lines.length === 0) {
      return 'No differences found';
    }

    return lines.join('\n');
  }
}

export const defaultDiffer = new SchemaDiffer();
