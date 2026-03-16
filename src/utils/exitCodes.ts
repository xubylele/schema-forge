export const EXIT_CODES = {
  SUCCESS: 0,
  VALIDATION_ERROR: 1,
  DRIFT_DETECTED: 2,
  CI_DESTRUCTIVE: 3,
} as const;

export function shouldFailCIDestructive(
  isCIEnvironment: boolean,
  hasDestructiveFindings: boolean,
  isForceEnabled: boolean,
): boolean {
  return isCIEnvironment && hasDestructiveFindings && !isForceEnabled;
}
