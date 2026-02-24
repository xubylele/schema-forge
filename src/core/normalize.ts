/**
 * Normalize identifiers for deterministic generated names.
 */
export function normalizeIdent(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function pkName(table: string): string {
  return `pk_${normalizeIdent(table)}`;
}

export function uqName(table: string, column: string): string {
  return `uq_${normalizeIdent(table)}_${normalizeIdent(column)}`;
}

export function legacyPkName(table: string): string {
  return `${normalizeIdent(table)}_pkey`;
}

export function legacyUqName(table: string, column: string): string {
  return `${normalizeIdent(table)}_${normalizeIdent(column)}_key`;
}
