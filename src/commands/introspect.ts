import { Command } from 'commander';
import path from 'path';
import { introspectPostgresSchema } from '../domain';
import { parseSchemaList, resolvePostgresConnectionString, withPostgresQueryExecutor } from '../core/postgres';
import { getProjectRoot } from '../core/paths';
import { writeTextFile } from '../core/fs';
import { info, success } from '../utils/output';

export interface IntrospectOptions {
  url?: string;
  schema?: string;
  json?: boolean;
  out?: string;
}

function resolveOutputPath(root: string, outputPath: string): string {
  return path.isAbsolute(outputPath) ? outputPath : path.join(root, outputPath);
}

export async function runIntrospect(options: IntrospectOptions = {}): Promise<void> {
  const connectionString = resolvePostgresConnectionString({ url: options.url });
  const schemas = parseSchemaList(options.schema);
  const root = getProjectRoot();

  const schema = await withPostgresQueryExecutor(connectionString, query => introspectPostgresSchema({
    query,
    ...(schemas ? { schemas } : {}),
  }));

  const output = JSON.stringify(schema, null, 2);

  if (!options.json && !options.out) {
    info(`Introspected ${Object.keys(schema.tables).length} table(s) from PostgreSQL.`);
  }

  if (options.out) {
    const outputPath = resolveOutputPath(root, options.out);
    await writeTextFile(outputPath, `${output}\n`);
    success(`Live schema written to ${outputPath}`);
  }

  if (options.json || !options.out) {
    console.log(output);
  }
}

export function createIntrospectCommand(): Command {
  const command = new Command('introspect');

  command
    .description('Extract normalized live schema from PostgreSQL')
    .option('--url <string>', 'PostgreSQL connection URL (defaults to DATABASE_URL)')
    .option('--schema <list>', 'Comma-separated schema names (default: public)')
    .option('--json', 'Output normalized schema JSON to stdout')
    .option('--out <path>', 'Write normalized schema JSON to a file')
    .action(async (options: IntrospectOptions) => {
      await runIntrospect(options);
    });

  return command;
}
