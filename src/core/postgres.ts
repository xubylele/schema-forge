import { Client } from 'pg';
import type { PostgresQueryExecutor } from '../domain';

export interface PostgresConnectionOptions {
  url?: string;
}

export function resolvePostgresConnectionString(options: PostgresConnectionOptions = {}): string {
  const explicitUrl = options.url?.trim();
  if (explicitUrl) {
    return explicitUrl;
  }

  const envUrl = process.env.DATABASE_URL?.trim();
  if (envUrl) {
    return envUrl;
  }

  throw new Error('PostgreSQL connection URL is required. Pass --url or set DATABASE_URL.');
}

export function parseSchemaList(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const schemas = value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  return schemas.length > 0 ? schemas : undefined;
}

export async function withPostgresQueryExecutor<T>(
  connectionString: string,
  run: (query: PostgresQueryExecutor) => Promise<T>
): Promise<T> {
  const client = new Client({ connectionString });
  await client.connect();

  const query: PostgresQueryExecutor = async <TRow extends object>(sql: string, params?: readonly unknown[]) => {
    const result = await client.query<TRow>(sql, params ? [...params] : undefined);
    return result.rows;
  };

  try {
    return await run(query);
  } finally {
    await client.end();
  }
}
