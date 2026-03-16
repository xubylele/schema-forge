import readline from 'node:readline';
import type { Finding } from '../domain';
import { EXIT_CODES } from './exitCodes';
import { error, theme, warning } from './output';

export function isCI(): boolean {
  return process.env.CI === 'true' || process.env.CONTINUOUS_INTEGRATION === 'true';
}

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

export async function confirmDestructiveOps(
  findings: Finding[],
  input?: NodeJS.ReadableStream,
  output?: NodeJS.WritableStream
): Promise<boolean> {
  const riskyFindings = findings.filter(
    f => f.severity === 'error' || f.severity === 'warning'
  );

  if (riskyFindings.length === 0) {
    return true;
  }

  if (isCI()) {
    error('Cannot run interactive prompts in CI environment. Use --force flag to bypass safety checks.');
    process.exitCode = EXIT_CODES.CI_DESTRUCTIVE;
    return false;
  }

  console.log('');
  console.log(formatFindingsSummary(riskyFindings));
  console.log('');

  const confirmed = await readConfirmation(input, output);

  if (!confirmed) {
    warning('Operation cancelled by user.');
  }

  return confirmed;
}

export function hasDestructiveFindings(findings: Finding[]): boolean {
  return findings.some(f => f.severity === 'error' || f.severity === 'warning');
}
