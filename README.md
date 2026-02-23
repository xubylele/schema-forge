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
npm install -g schema-forge
```

Or use directly with npx (no installation required):

```bash
npx schema-forge init
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
schemaforge init
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
  email varchar unique
  name text
  created_at timestamptz default now()
}

table posts {
  id uuid pk
  user_id uuid fk users.id
  title varchar
  content text
  published boolean default false
  created_at timestamptz default now()
}
```

### 3. Generate your first migration

```bash
schemaforge generate
```

This generates a timestamped SQL migration file with CREATE TABLE statements and updates the state file.

### 4. Make schema changes

Edit `schemaforge/schema.sf` to add a new column:

```sql
table users {
  id uuid pk
  email varchar unique
  name text
  avatar_url text          # New column!
  created_at timestamptz default now()
}
```

### 5. Generate a migration for the changes

```bash
schemaforge generate --name "add user avatar"
```

This generates a new migration file with ALTER TABLE statements.

### 6. Check for pending changes

```bash
schemaforge diff
```

If your schema matches the state file, you'll see "No changes detected". If there are changes, it will display the SQL that would be generated.

## Commands

### `schemaforge init`

Initialize a new SchemaForge project in the current directory.

```bash
schemaforge init
```

Creates the necessary directory structure and configuration files.

### `schemaforge generate`

Generate SQL migration from schema changes.

```bash
schemaforge generate [--name "migration description"]
```

**Options:**

- `--name` - Optional name for the migration (default: "migration")

Compares your current schema with the tracked state, generates SQL for any changes, and updates the state file.

### `schemaforge diff`

Compare your schema with the current state without generating files.

```bash
schemaforge diff
```

Shows what SQL would be generated if you ran `generate`. Useful for previewing changes.

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
- `nullable` - Allow NULL values (columns are NOT NULL by default)
- `default <value>` - Default value (e.g., `default now()`, `default false`, `default 0`)
- `fk <table>.<column>` - Foreign key reference (e.g., `fk users.id`)

### Examples

#### Simple table

```sql
table users {
  id uuid pk
  email varchar unique
  name text
  created_at timestamptz default now()
}
```

#### Table with foreign keys

```sql
table posts {
  id uuid pk
  author_id uuid fk users.id
  title varchar
  content text
  published boolean default false
  created_at timestamptz default now()
}
```

#### Table with nullable columns

```sql
table profiles {
  id uuid pk
  user_id uuid fk users.id
  bio text nullable
  avatar_url text nullable
  website varchar nullable
  updated_at timestamptz default now()
}
```

## Project Structure

```bash
your-project/
├── schemaforge/
│   ├── schema.sf          # Your schema definition (edit this!)
│   ├── config.json        # Project configuration
│   └── state.json         # State tracking (auto-generated)
└── supabase/
    └── migrations/        # Generated SQL migrations
        ├── 20240101120000-initial.sql
        └── 20240101120100-add-user-avatar.sql
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

1. **Initialize** - `schemaforge init` (one time)
2. **Edit schema** - Modify `schemaforge/schema.sf`
3. **Preview changes** - `schemaforge diff` (optional)
4. **Generate migration** - `schemaforge generate --name "description"`
5. **Apply migration** - Run the generated SQL against your database
6. **Repeat** - Continue editing and generating migrations as needed

## Tips

- Use descriptive migration names with `--name` to make your migration history readable
- Run `diff` before `generate` to preview what SQL will be created
- Commit your schema files and migrations to version control
- The state file tracks your schema evolution - don't edit it manually

## Publishing to npm

For maintainers, to publish a new version:

```bash
# Login to npm (one time)
npm login

# Update version in package.json
npm version patch  # or minor, major

# Build and publish
npm publish --access public
```

The `prepublishOnly` script automatically runs the build before publishing.

## License

ISC
