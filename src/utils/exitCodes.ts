/**
 * Exit codes used throughout the CLI for deterministic behavior
 *
 * @see SF-106 Standardize Exit Codes
 */

export const EXIT_CODES = {
  /** Successful operation */
  SUCCESS: 0,

  /** Validation error (invalid DSL syntax, config errors, missing files, etc.) */
  VALIDATION_ERROR: 1,

  /** Drift detected - Reserved for future use when comparing actual DB state vs schema */
  DRIFT_DETECTED: 2,

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
