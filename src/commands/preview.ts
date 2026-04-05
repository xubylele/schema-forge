import { Command } from 'commander';
import type { PlanOptions } from './plan';
import { runPlan } from './plan';

export interface PreviewOptions extends PlanOptions { }

export async function runPreview(options: PreviewOptions = {}): Promise<void> {
  await runPlan(options);
}

export function createPreviewCommand(): Command {
  const command = new Command('preview');

  command
    .description('Preview migration operations (alias of plan)')
    .option('--url <string>', 'PostgreSQL connection URL for live preview (defaults to DATABASE_URL)')
    .option('--schema <list>', 'Comma-separated schema names to introspect (default: public)')
    .action(async (options: PreviewOptions) => {
      await runPreview(options);
    });

  return command;
}
