# SchemaForge

A modern CLI tool for database schema management with a clean DSL and automatic SQL migration generation.

**Website:** [schemaforge.xuby.cl](https://schemaforge.xuby.cl/) · **npm package:** [@xubylele/schema-forge](https://www.npmjs.com/package/@xubylele/schema-forge)

## Features

- **Simple DSL** - Define your schema with a clean, intuitive syntax
- **Migration Generation** - Automatically generate SQL migrations from schema changes
- **State Tracking** - Built-in state management to track your schema evolution
- **Type Safety** - Validates your schema before generating SQL
- **Default Change Detection** - Detects added/removed/modified column defaults and generates ALTER COLUMN SET/DROP DEFAULT
- **Postgres/Supabase** - Currently supports PostgreSQL and Supabase
- **Constraint Diffing** - Detects UNIQUE and PRIMARY KEY changes with deterministic constraint names
- **Live PostgreSQL Introspection** - Extract normalized schema directly from `information_schema`

## Installation

Install globally via npm:

```bash
npm install -g @xubylele/schema-forge
```

Or use directly with npx (no installation required):

```bash
npx @xubylele/schema-forge init
```

### Programmatic API

Use the programmatic API from Node (e.g. scripts, GitHub Actions) instead of invoking the CLI via shell:

```js
const { generate, EXIT_CODES } = require('@xubylele/schema-forge/api');

const result = await generate({ name: 'MyMigration' });
if (result.exitCode !== EXIT_CODES.SUCCESS) process.exit(result.exitCode);
```

**Exports:** `init`, `generate`, `diff`, `doctor`, `validate`, `introspect`, `importSchema` (each returns `Promise<RunResult>`), `RunResult` (`{ exitCode: number }`), `EXIT_CODES`, and option types (`GenerateOptions`, `DiffOptions`, etc.). Entrypoint: `@xubylele/schema-forge/api`. Exit code semantics: [docs/exit-codes.json](docs/exit-codes.json).

## Development

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd schema-forge
npm install
```

Build the project:

```bash
npm run build
```

Run in development mode:

```bash
npm run dev -- [command]
```

Run tests:

```bash
npm test
```

Run real-db drift integration tests:

```bash
npm run test:integration:drift
```

Notes:

- Local explicit run: set `SF_RUN_REAL_DB_TESTS=true` (uses Testcontainers `postgres:16-alpine`, Docker required).
- CI/service mode: set `SF_USE_CI_POSTGRES=true` and `DATABASE_URL` to reuse an existing Postgres service.

## Getting Started

Here's a quick walkthrough to get started with SchemaForge:

### 1. Initialize a new project

```bash
schema-forge init
```

This creates:

- `schemaforge/schema.sf` - Your schema definition file
- `schemaforge/config.json` - Project configuration
- `schemaforge/state.json` - State tracking file
- `supabase/migrations/` - Directory for generated migrations

### 2. Define your schema

Edit `schemaforge/schema.sf`:

```sql
# SchemaForge schema definition

table users {
  id uuid pk
  email varchar unique not null
  name text not null
  created_at timestamptz default now()
}

table posts {
  id uuid pk
  user_id uuid fk users.id not null
  title varchar not null
  content text
  published boolean default false
  created_at timestamptz default now()
}
```

### 3. Generate your first migration

```bash
schema-forge generate
```

This generates a timestamped SQL migration file with CREATE TABLE statements and updates the state file.

### 4. Make schema changes

Edit `schemaforge/schema.sf` to add a new column:

```sql
table users {
  id uuid pk
  email varchar unique not null
  name text not null
  avatar_url text          # New column!
  created_at timestamptz default now()
}
```

### 5. Generate a migration for the changes

```bash
schema-forge generate --name "add user avatar"
```

This generates a new migration file with ALTER TABLE statements.

### 6. Check for pending changes

```bash
schema-forge diff
```

If your schema matches the state file, you'll see "No changes detected". If there are changes, it will display the SQL that would be generated.

### Default value changes

Schema Forge also tracks default changes on existing columns when diffing `schema.sf` against `state.json`.

Supported migration output:

```sql
ALTER TABLE <table_name> ALTER COLUMN <column_name> SET DEFAULT <expr>;
ALTER TABLE <table_name> ALTER COLUMN <column_name> DROP DEFAULT;
```

Examples:

- Add default: `created_at timestamptz` -> `created_at timestamptz default now()`
- Remove default: `created_at timestamptz default now()` -> `created_at timestamptz`
- Modify default: `default now()` -> `default timezone('utc', now())`

For common function-style defaults, comparisons are normalized to avoid obvious false positives (for example `NOW()` and `now()`).

## Commands

### `schema-forge init`

Initialize a new SchemaForge project in the current directory.

```bash
schema-forge init
```

Creates the necessary directory structure and configuration files.

### `schema-forge generate`

Generate SQL migration from schema changes.

```bash
schema-forge generate [--name "migration description"] [--safe] [--force]
```

**Options:**

- `--name` - Optional name for the migration (default: "migration")
- `--safe` - Block execution if destructive operations are detected (exits with error)
- `--force` - Bypass safety checks and proceed with destructive operations (shows warning)

**Safety Behavior:**

When destructive or risky operations are detected (like dropping columns or tables), SchemaForge will:

1. **Without flags** - Display an interactive prompt showing the risky operations and ask for confirmation (yes/no)
2. **With `--safe`** - Block execution immediately and exit with error code 1, listing all destructive operations
3. **With `--force`** - Bypass safety checks, show a warning message, and proceed with generating the migration
4. **In CI environment** (`CI=true`) - Skip the interactive prompt, fail with exit code 3 for destructive operations unless `--force` is used

See [CI Behavior](#ci-behavior) for more details.

Compares your current schema with the tracked state, generates SQL for any changes, and updates the state file.

### `schema-forge diff`

Compare your schema with the current state without generating files.

```bash
schema-forge diff [--safe] [--force]
```

**Options:**

- `--safe` - Block execution if destructive operations are detected (exits with error)
- `--force` - Bypass safety checks and proceed with displaying destructive SQL (shows warning)
- `--url` - PostgreSQL connection URL for live database diff (fallback: `DATABASE_URL`)
- `--schema` - Comma-separated schema names to introspect (default: `public`)

Shows what SQL would be generated if you ran `generate`. Useful for previewing changes. Safety behavior is the same as `generate` command. In CI environments, exits with code 3 if destructive operations are detected unless `--force` is used. See [CI Behavior](#ci-behavior) for more details.

When `--url` (or `DATABASE_URL`) is provided, `diff` compares your target DSL schema against the live PostgreSQL schema introspected from `information_schema`.

### `schema-forge import`

Reconstruct `schemaforge/schema.sf` from existing PostgreSQL/Supabase SQL migrations.

```bash
schema-forge import <path-to-sql-file-or-migrations-dir>
```

**Options:**

- `--out <path>` - Optional output schema file path (default: `schemaforge/schema.sf`)

Behavior:

- Parses supported DDL statements in order from a file or from sorted migration filenames in a directory
- Ignores unsupported SQL safely and prints warnings
- Writes a normalized SchemaForge DSL schema file

### `schema-forge validate`

Detect destructive or risky schema changes before generating/applying migrations.

```bash
schema-forge validate
```

Live drift validation:

```bash
schema-forge validate --url "$DATABASE_URL" --json
```

Live `--json` output returns a structured `DriftReport`:

```json
{
  "missingTables": ["users_archive"],
  "extraTables": ["audit_log"],
  "columnDifferences": [
    {
      "tableName": "users",
      "missingInLive": ["nickname"],
      "extraInLive": ["last_login"]
    }
  ],
  "typeMismatches": [
    {
      "tableName": "users",
      "columnName": "email",
      "expectedType": "varchar",
      "actualType": "text"
    }
  ]
}
```

Validation checks include:

- Dropped tables (`DROP_TABLE`, error)
- Dropped columns (`DROP_COLUMN`, error)
- Column type changes (`ALTER_COLUMN_TYPE`, warning/error based on compatibility heuristics)
- Nullable to NOT NULL changes (`SET_NOT_NULL`, warning)

Use JSON mode for CI and automation:

```bash
schema-forge validate --json
```

Live mode options:

- `--url` - PostgreSQL connection URL for live drift validation (fallback: `DATABASE_URL`)
- `--schema` - Comma-separated schema names to introspect (default: `public`)

In live mode, exit code `2` is used when drift is detected between `state.json` and the live database. For all exit codes used by `validate`, see [Exit code standards](#exit-code-standards).

### `schema-forge doctor`

Check live database drift against your tracked `state.json`.

```bash
schema-forge doctor --url "$DATABASE_URL"
```

Use JSON mode for CI and automation:

```bash
schema-forge doctor --url "$DATABASE_URL" --json
```

Options:

- `--url` - PostgreSQL connection URL (fallback: `DATABASE_URL`)
- `--schema` - Comma-separated schema names to introspect (default: `public`)
- `--json` - Output structured drift report JSON

Exit codes: see [Exit code standards](#exit-code-standards) (doctor uses 0, 2).

### `schema-forge introspect`

Extract normalized schema directly from a live PostgreSQL database.

```bash
schema-forge introspect --url "$DATABASE_URL" --json
```

**Options:**

- `--url` - PostgreSQL connection URL (fallback: `DATABASE_URL`)
- `--schema` - Comma-separated schema names to introspect (default: `public`)
- `--json` - Output normalized schema as JSON
- `--out <path>` - Write normalized schema JSON to a file

## CI Behavior

SchemaForge ensures deterministic behavior in Continuous Integration (CI) environments to prevent accidental destructive operations.

### Detecting CI Environment

CI mode is automatically activated when either environment variable is set:

- `CI=true`
- `CONTINUOUS_INTEGRATION=true`

### Exit code standards

SchemaForge uses specific exit codes for deterministic CI and script behavior. The following is the single source of truth.

| Exit Code | Name | Meaning |
| --------- | ---- | ------- |
| `0` | SUCCESS | No changes or no destructive operations detected |
| `1` | VALIDATION_ERROR | Invalid DSL, config errors, missing files, or operation declined (e.g. with `--safe`) |
| `2` | DRIFT_DETECTED | Drift between expected state and live database schema |
| `3` | CI_DESTRUCTIVE | Destructive operations detected in CI without `--force` |

**Per-command exit codes:**

| Command | Possible exit codes |
| ------- | -------------------- |
| `validate` | 0, 1, 2, 3 |
| `doctor` | 0, 2 |
| `diff`, `generate` | 0, 1, 3 |
| `init`, `import` | 0 |

(Global CLI errors, e.g. unknown command or missing config, exit with 1.)

A machine-readable exit code contract is available at [docs/exit-codes.json](docs/exit-codes.json). It includes a `version` field and an optional `commands` map for tooling.

### Destructive Operations in CI

When running in a CI environment, destructive operations (those flagged as `error` or `warning` level findings) trigger exit code 3:

**Operations classified as destructive:**

- Dropping tables (`DROP_TABLE`)
- Dropping columns (`DROP_COLUMN`)
- Changing column types in incompatible ways
- Making columns NOT NULL when they allow NULL

### Overriding in CI

To proceed with destructive operations in CI, use the `--force` flag:

```bash
# This will fail with exit code 3 if destructive changes detected
schema-forge generate

# This will proceed despite destructive changes (requires explicit acknowledgment)
schema-forge generate --force
```

### No Interactive Prompts in CI

When `CI=true`, SchemaForge will:

- ✅ Never show interactive prompts, preventing script hangs
- ✅ Fail deterministically (exit code 3) for destructive operations
- ✅ Allow explicit override with `--force` flag
- ❌ Not accept user input for confirmation

### Drift Integration Tests in CI

For drift reliability checks against a real database, run:

```bash
npm run test:integration:drift
```

The integration harness supports two deterministic paths:

- `SF_USE_CI_POSTGRES=true` + `DATABASE_URL`: uses the CI Postgres service directly.
- No CI Postgres env: spins up an isolated Testcontainers Postgres instance.

### Using `--safe` in CI

The `--safe` flag is compatible with CI and blocks execution of destructive operations:

```bash
# Blocks execution if destructive operations detected, exits with code 1
schema-forge generate --safe
```

This is useful for strict CI pipelines where all destructive changes must be reviewed and merged separately.

### Using exit codes in CI

In CI, rely on the process exit code to fail the job when validation or safety checks fail. Example with a shell script:

```bash
schema-forge validate --json
if [ $? -ne 0 ]; then
  echo "Schema validation failed (exit code: $?)"
  exit 1
fi
```

When using the [schema-forge-action](https://github.com/xubylele/schema-forge-action), the action passes through the CLI exit code: a non-zero exit from Schema Forge fails the job with that same code, so no extra script is needed.

## Constraint Change Detection

SchemaForge detects and generates migrations for:

- Column-level `unique` added/removed
- Table primary key added/removed/changed (single-column PK)

### Deterministic Constraint Names

To keep migrations stable and safe to drop later, generated constraint names are deterministic:

- Primary key: `pk_<table>` (example: `pk_users`)
- Unique (column): `uq_<table>_<column>` (example: `uq_users_email`)

Identifiers are normalized to lowercase, non-alphanumeric characters are replaced with `_`, and repeated `_` are collapsed.

### Generated SQL Examples

Add unique:

```sql
ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email);
```

Remove unique:

```sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_email;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
```

Change primary key column (`id` -> `user_id`):

```sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS pk_users;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey;

ALTER TABLE users ADD CONSTRAINT pk_users PRIMARY KEY (user_id);
```

When dropping constraints, SchemaForge attempts deterministic names first, then PostgreSQL legacy defaults (`<table>_pkey`, `<table>_<column>_key`) for compatibility.

Also includes nullability migrations when `not null` is added or removed:

```sql
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
```

## Schema DSL Format

Schemas are defined using the `.sf` format with a clean, readable syntax.

### Basic Syntax

```sql
# Comments start with # or //

table table_name {
  column_name column_type [modifiers...]
}
```

### Supported Column Types

- `uuid` - UUID/GUID
- `varchar` - Variable-length string
- `text` - Long text
- `int` - Integer
- `boolean` - Boolean value
- `timestamptz` - Timestamp with timezone
- `date` - Date without time

### Column Modifiers

- `pk` - Primary key
- `unique` - Unique constraint
- `not null` - Disallow NULL values
- `nullable` - Allow NULL values (default when `not null` is not provided)
- `default <value>` - Default value (e.g., `default now()`, `default false`, `default 0`)
- `fk <table>.<column>` - Foreign key reference (e.g., `fk users.id`)

### Examples

#### Simple table

```sql
table users {
  id uuid pk
  email varchar unique not null
  name text not null
  created_at timestamptz default now()
}
```

#### Table with foreign keys

```sql
table posts {
  id uuid pk
  author_id uuid fk users.id not null
  title varchar not null
  content text
  published boolean default false
  created_at timestamptz default now()
}
```

#### Table with mixed nullability

```sql
table profiles {
  id uuid pk
  user_id uuid fk users.id not null
  bio text nullable
  avatar_url text nullable
  website varchar nullable
  updated_at timestamptz default now()
}
```

## Project Structure

```bash
your-project/
+-- schemaforge/
|   +-- schema.sf          # Your schema definition (edit this!)
|   +-- config.json        # Project configuration
|   \-- state.json         # State tracking (auto-generated)
\-- supabase/
  \-- migrations/        # Generated SQL migrations
    +-- 20240101120000-initial.sql
    \-- 20240101120100-add-user-avatar.sql
```

## Configuration

The `schemaforge/config.json` file contains project configuration:

```json
{
  "provider": "supabase",
  "outputDir": "supabase/migrations",
  "schemaFile": "schemaforge/schema.sf",
  "stateFile": "schemaforge/state.json",
  "sql": {
    "uuidDefault": "gen_random_uuid()",
    "timestampDefault": "now()"
  }
}
```

## Supported Databases

Currently supports:

- PostgreSQL (`postgres`)
- Supabase (`supabase`)

## Development Workflow

A typical development workflow looks like this:

1. **Initialize** - `schema-forge init` (one time)
2. **Edit schema** - Modify `schemaforge/schema.sf`
3. **Preview changes** - `schema-forge diff` (optional)
4. **Generate migration** - `schema-forge generate --name "description"`
5. **Apply migration** - Run the generated SQL against your database
6. **Repeat** - Continue editing and generating migrations as needed

## Tips

- Use descriptive migration names with `--name` to make your migration history readable
- Run `diff` before `generate` to preview what SQL will be created
- Commit your schema files and migrations to version control
- The state file tracks your schema evolution - don't edit it manually

## Releasing

Schema Forge uses automated releases via GitHub Actions and [Changesets](https://github.com/changesets/changesets).

When contributing changes, create a changeset:

```bash
npx changeset
```

Once your PR is merged to `main`, the release workflow automatically:

- Bumps the version
- Updates the CHANGELOG
- Creates a git tag
- Publishes to npm

No manual steps required! See [docs/releasing.md](docs/releasing.md) for detailed documentation.

### Publishing Manually

To publish a scoped package to npm:

```bash
npm publish --access public
```

Or use the convenience script:

```bash
npm run publish:public
```

For detailed guidelines on contributing and automated releases, see [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/releasing.md](docs/releasing.md).

## License

ISC
