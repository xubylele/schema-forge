import { randomUUID } from 'crypto';
import { Client } from 'pg';
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';

const CI_POSTGRES_FLAG = 'SF_USE_CI_POSTGRES';

export interface PostgresTestHarness {
  connectionString: string;
  resetPublicSchema: () => Promise<void>;
  execute: (sql: string) => Promise<void>;
  close: () => Promise<void>;
}

function resolveCiConnectionString(): string | undefined {
  if (process.env[CI_POSTGRES_FLAG] !== 'true') {
    return undefined;
  }
  return process.env.DATABASE_URL?.trim() || undefined;
}

async function executeSql(connectionString: string, sql: string): Promise<void> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

export async function createPostgresTestHarness(): Promise<PostgresTestHarness> {
  const ciConnectionString = resolveCiConnectionString();
  if (ciConnectionString) {
    return {
      connectionString: ciConnectionString,
      resetPublicSchema: async () => {
        await executeSql(
          ciConnectionString,
          'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;'
        );
      },
      execute: async (sql: string) => executeSql(ciConnectionString, sql),
      close: async () => {},
    };
  }

  const dbName = `schemaforge_${randomUUID().replace(/-/g, '')}`;
  const container = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
      POSTGRES_DB: dbName,
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
    .start();

  const connectionString = `postgres://postgres:postgres@${container.getHost()}:${container.getMappedPort(5432)}/${dbName}`;

  return createContainerHarness(container, connectionString);
}

function createContainerHarness(
  container: StartedTestContainer,
  connectionString: string
): PostgresTestHarness {
  return {
    connectionString,
    resetPublicSchema: async () => {
      await executeSql(
        connectionString,
        'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;'
      );
    },
    execute: async (sql: string) => executeSql(connectionString, sql),
    close: async () => {
      await container.stop();
    },
  };
}
