import { Command } from 'commander';

export interface GenerateOptions {
  name?: string;
}

export async function runGenerate(options: GenerateOptions): Promise<void> {
  console.log('Generating SQL...');
  console.log('Name:', options.name ?? '(default)');

  // TODO: Implement SQL generation logic
  // - Parse schema files from input path
  // - Validate schemas
  // - Generate SQL based on database type
  // - Write to output file

  console.log('✓ SQL generated successfully');
}

export function createGenerateCommand(): Command {
  const command = new Command('generate');

  command
    .description('Generate SQL from schema files')
    .option('--name <string>', 'Schema name to generate')
    .action(async (options: GenerateOptions) => {
      await runGenerate(options);
    });

  return command;
}
