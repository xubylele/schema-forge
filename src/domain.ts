import type {
  ApplySqlOpsResult,
  DriftReport,
  Finding,
  MigrationPlanEntry,
  MigrationPlanResult,
  MigrationSqlInput,
  ParseResult,
  PostgresIntrospectionOptions,
  PostgresQueryExecutor,
  Provider,
  SqlOp,
  SqlConfig,
  ValidationReport
} from '@xubylele/schema-forge-core';

type SchemaForgeCore = typeof import('@xubylele/schema-forge-core');

export type DatabaseSchema = ReturnType<SchemaForgeCore['parseSchema']>;
export type StateFile = Awaited<ReturnType<SchemaForgeCore['loadState']>>;
export type DiffResult = ReturnType<SchemaForgeCore['diffSchemas']>;
export type Table = DatabaseSchema['tables'][string];
export type Column = Table['columns'][number];

let corePromise: Promise<SchemaForgeCore> | undefined;

async function loadCore(): Promise<SchemaForgeCore> {
  if (!corePromise) {
    corePromise = import('@xubylele/schema-forge-core');
  }

  return corePromise;
}

export async function parseSchema(source: string): Promise<DatabaseSchema> {
  const core = await loadCore();
  return core.parseSchema(source);
}

export async function validateSchema(schema: DatabaseSchema): Promise<void> {
  const core = await loadCore();
  core.validateSchema(schema);
}

export async function diffSchemas(previousState: StateFile, currentSchema: DatabaseSchema): Promise<DiffResult> {
  const core = await loadCore();
  return core.diffSchemas(previousState, currentSchema);
}

export async function generateSql(diff: DiffResult, provider: Provider, config?: SqlConfig): Promise<string> {
  const core = await loadCore();
  return core.generateSql(diff, provider, config);
}

export async function buildMigrationPlan(diff: DiffResult): Promise<MigrationPlanResult> {
  const core = await loadCore();
  return core.buildMigrationPlan(diff);
}

export async function formatMigrationPlanLines(entries: MigrationPlanEntry[]): Promise<string[]> {
  const core = await loadCore();
  return core.formatMigrationPlanLines(entries);
}

export async function schemaToState(schema: DatabaseSchema): Promise<StateFile> {
  const core = await loadCore();
  return core.schemaToState(schema);
}

export async function loadState(statePath: string): Promise<StateFile> {
  const core = await loadCore();
  return core.loadState(statePath);
}

export async function saveState(statePath: string, state: StateFile): Promise<void> {
  const core = await loadCore();
  return core.saveState(statePath, state);
}

export async function validateSchemaChanges(previousState: StateFile, currentSchema: DatabaseSchema): Promise<Finding[]> {
  const core = await loadCore();
  return core.validateSchemaChanges(previousState, currentSchema);
}

export async function toValidationReport(findings: Finding[]): Promise<ValidationReport> {
  const core = await loadCore();
  return core.toValidationReport(findings);
}

export async function parseMigrationSql(sql: string): Promise<ParseResult> {
  const core = await loadCore();
  return core.parseMigrationSql(sql);
}

export async function introspectPostgresSchema(options: PostgresIntrospectionOptions): Promise<DatabaseSchema> {
  const core = await loadCore();
  return core.introspectPostgresSchema(options);
}

export async function analyzeSchemaDrift(state: StateFile, liveSchema: DatabaseSchema): Promise<DriftReport> {
  const core = await loadCore();
  return core.analyzeSchemaDrift(state, liveSchema);
}

export async function applySqlOps(ops: ParseResult['ops']): Promise<ApplySqlOpsResult> {
  const core = await loadCore();
  return core.applySqlOps(ops);
}

export async function schemaToDsl(schema: DatabaseSchema): Promise<string> {
  const core = await loadCore();
  return core.schemaToDsl(schema);
}

export async function loadMigrationSqlInput(inputPath: string): Promise<MigrationSqlInput[]> {
  const core = await loadCore();
  return core.loadMigrationSqlInput(inputPath);
}

export async function createSchemaValidationError(message: string): Promise<Error> {
  const core = await loadCore();
  return new core.SchemaValidationError(message);
}

export async function isSchemaValidationError(error: unknown): Promise<boolean> {
  const core = await loadCore();
  return error instanceof core.SchemaValidationError;
}

export type {
  ApplySqlOpsResult,
  DriftReport,
  Finding,
  MigrationPlanEntry,
  MigrationPlanResult,
  MigrationSqlInput,
  ParseResult,
  PostgresIntrospectionOptions,
  PostgresQueryExecutor,
  Provider,
  SqlOp,
  SqlConfig,
  ValidationReport
};