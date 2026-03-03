/**
 * Interactive prompt utilities for confirming destructive operations.
 */

import readline from 'node:readline';
import type { Finding } from '../domain.js';
import { EXIT_CODES } from './exitCodes.js';
import { error, theme, warning } from './output.js';

/**
 * Checks if running in a CI environment.
 */
export function isCI(): boolean {
  return process.env.CI === 'true' || process.env.CONTINUOUS_INTEGRATION === 'true';
}

/**
 * Formats a list of findings into a human-readable summary.
 */
function formatFindingsSummary(findings: Finding[]): string {
  const errors = findings.filter(f => f.severity === 'error');
  const warnings = findings.filter(f => f.severity === 'warning');

  const lines: string[] = [];

  if (errors.length > 0) {
    lines.push(theme.error('DESTRUCTIVE OPERATIONS:'));
    for (const finding of errors) {
      const columnPart = finding.column ? `.${finding.column}` : '';
      const fromTo = finding.from && finding.to ? ` (${finding.from} → ${finding.to})` : '';
      lines.push(theme.error(`  • ${finding.code}: ${finding.table}${columnPart}${fromTo}`));
    }
  }

  if (warnings.length > 0) {
    if (lines.length > 0) lines.push(''); // blank line
    lines.push(theme.warning('WARNING OPERATIONS:'));
    for (const finding of warnings) {
      const columnPart = finding.column ? `.${finding.column}` : '';
      const fromTo = finding.from && finding.to ? ` (${finding.from} → ${finding.to})` : '';
      lines.push(theme.warning(`  • ${finding.code}: ${finding.table}${columnPart}${fromTo}`));
    }
  }

  return lines.join('\n');
}

/**
 * Prompts user for yes/no confirmation from stdin.
 * Returns true for 'yes'/'y', false for 'no'/'n'.
 * Re-prompts on invalid input.
 */
async function readConfirmation(input: NodeJS.ReadableStream | undefined = process.stdin, output: NodeJS.WritableStream | undefined = process.stdout): Promise<boolean> {
  const rl = readline.createInterface({
    input: input as NodeJS.ReadableStream,
    output: output as NodeJS.WritableStream
  });

  return new Promise<boolean>((resolve) => {
    const askQuestion = () => {
      rl.question(theme.primary('Proceed with these changes? (yes/no): '), (answer) => {
        const normalized = answer.trim().toLowerCase();

        if (normalized === 'yes' || normalized === 'y') {
          rl.close();
          resolve(true);
        } else if (normalized === 'no' || normalized === 'n') {
          rl.close();
          resolve(false);
        } else {
          console.log(theme.warning('Please answer "yes" or "no".'));
          askQuestion(); // Re-prompt
        }
      });
    };

    askQuestion();
  });
}

/**
 * Displays a summary of risky operations and prompts for confirmation.
 * 
 * @param findings - Array of findings from safety check
 * @param input - Optional stdin stream (for testing)
 * @param output - Optional stdout stream (for testing)
 * @returns Promise<boolean> - true if user confirms, false if user declines or in CI
 * 
 * Behavior:
 * - In CI environment with destructive findings: sets exit code 3 and returns false immediately
 * - Interactive mode: shows summary and waits for yes/no confirmation
 * - Re-prompts on invalid input
 */
export async function confirmDestructiveOps(
  findings: Finding[],
  input?: NodeJS.ReadableStream,
  output?: NodeJS.WritableStream
): Promise<boolean> {
  // Filter to only error and warning level findings
  const riskyFindings = findings.filter(
    f => f.severity === 'error' || f.severity === 'warning'
  );

  // If no risky operations, no need to prompt
  if (riskyFindings.length === 0) {
    return true;
  }

  // CI environment check - must use explicit --force flag
  if (isCI()) {
    error('Cannot run interactive prompts in CI environment. Use --force flag to bypass safety checks.');
    process.exitCode = EXIT_CODES.CI_DESTRUCTIVE;
    return false;
  }

  // Display summary
  console.log('');
  console.log(formatFindingsSummary(riskyFindings));
  console.log('');

  // Read user confirmation
  const confirmed = await readConfirmation(input, output);

  if (!confirmed) {
    warning('Operation cancelled by user.');
  }

  return confirmed;
}

/**
 * Checks if findings contain destructive or warning-level operations.
 * @param findings - Array of findings from safety check
 * @returns true if any error or warning level findings exist
 */
export function hasDestructiveFindings(findings: Finding[]): boolean {
  return findings.some(f => f.severity === 'error' || f.severity === 'warning');
}
