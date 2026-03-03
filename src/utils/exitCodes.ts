/**
 * Exit codes used throughout the CLI for deterministic behavior
 */

export const EXIT_CODES = {
  /** Successful operation */
  SUCCESS: 0,

  /** General error (operation failed, user declined, missing files, etc.) */
  ERROR: 1,

  /** Schema validation error (invalid DSL syntax or structure) */
  SCHEMA_ERROR: 2,

  /** Destructive operation detected in CI environment without --force */
  CI_DESTRUCTIVE: 3,
} as const;

/**
 * Check if operation should fail due to destructive changes in CI
 * @param isCIEnvironment - Whether running in CI (CI=true env var)
 * @param hasDestructiveFindings - Whether dangerous changes were detected
 * @param isForceEnabled - Whether --force flag is set
 * @returns true if should exit with code 3, false otherwise
 */
export function shouldFailCIDestructive(
  isCIEnvironment: boolean,
  hasDestructiveFindings: boolean,
  isForceEnabled: boolean,
): boolean {
  // In CI with destructive ops, fail unless --force is used
  return isCIEnvironment && hasDestructiveFindings && !isForceEnabled;
}
