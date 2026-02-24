# SchemaForge

A modern CLI tool for database schema management with a clean DSL and automatic SQL migration generation.

## Features

- **Simple DSL** - Define your schema with a clean, intuitive syntax
- **Migration Generation** - Automatically generate SQL migrations from schema changes
- **State Tracking** - Built-in state management to track your schema evolution
- **Type Safety** - Validates your schema before generating SQL
- **Postgres/Supabase** - Currently supports PostgreSQL and Supabase

## Installation

Install globally via npm:

```bash
npm install -g @xubylele/schema-forge
```

Or use directly with npx (no installation required):

```bash
npx @xubylele/schema-forge init
```

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
schema-forge generate [--name "migration description"]
```

**Options:**

- `--name` - Optional name for the migration (default: "migration")

Compares your current schema with the tracked state, generates SQL for any changes, and updates the state file.

### `schema-forge diff`

Compare your schema with the current state without generating files.

```bash
schema-forge diff
```

Shows what SQL would be generated if you ran `generate`. Useful for previewing changes.

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
