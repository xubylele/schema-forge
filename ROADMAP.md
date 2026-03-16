# Schema Forge — Free Features & Multi‑Engine Roadmap

## Strategic Goals

1. Make Schema Forge the best migration CLI for PostgreSQL / Supabase.
2. Expand the DSL to cover most database schema constructs.
3. Enable importing existing databases (SQL or live DB) to accelerate adoption.
4. Introduce a provider architecture to support multiple database engines.

---

# Already Shipped (Completed)

These phases remain as the current baseline.

### Phase 1 — Core CLI ✅

* DSL parser
* Schema validation
* Deterministic diff engine
* SQL migration generator
* Commands: `init`, `diff`, `generate`, `validate`, `import`, `introspect`, `doctor`

### Phase 2 — Safety & Reliability ✅

* Destructive change detection
* Safe mode (`--safe`), force mode (`--force`)
* Interactive confirmations, JSON output for CI
* CI-aware exit codes

### Phase 3 — Developer Experience ✅

* VSCode extension: syntax, diagnostics, completion, hover, code actions
* Preview SQL, diff preview, visual diff, schema status bar
* Commands: init, generate, diff, diffPreview, previewSql, visualDiff, statusBarClick

### In Progress

* Website (docs, login, signup, CLI login page), playground (browser core)
* Schema Forge Cloud (auth, device login for CLI)
* GitHub Action (validate, doctor, diff, PR comment preview)

---

# Phase 1 — PostgreSQL Schema Coverage

## Week 1 — Policies (RLS)

### Ticket: DSL support for policies

Goal: Add PostgreSQL RLS policy support to the DSL.

Tasks:

* Add PolicyNode to AST
* Extend parser
* Add diff detection
* Add SQL generator

Example DSL

```
policy "Users can read themselves" on users
for select
using auth.uid() = id
```

---

## Week 2 — Views + Indexes

### Ticket: DSL support for views

Tasks:

* Add ViewNode to AST
* Parser support
* Diff detection
* SQL generation

### Ticket: DSL support for indexes

Support:

* unique
* partial
* expression indexes

Example:

```
index users_email_idx on users(email)
```

---

## Week 3 — Functions

### Ticket: DSL support for functions

Tasks:

* AST node
* parser support
* function body hashing
* SQL generation
* diff detection

Example:

```
function get_user_posts(user_id uuid)
returns setof posts
language sql
as $$
select * from posts where user_id = user_id
$$
```

---

## Week 4 — Triggers

### Ticket: DSL support for triggers

Example:

```
trigger update_timestamp
before update on users
for each row
execute function update_updated_at()
```

---

# Phase 2 — Migration Engine Improvements

## Week 5 — Migration Planner

### Ticket: Implement migration planner

Command:

```
schemaforge plan
```

Output example:

```
+ create table posts
+ add column avatar_url
~ modify column email type
```

---

## Week 6 — Migration Safety Checks

### Ticket: Detect destructive migrations

Detect:

* DROP TABLE
* DROP COLUMN
* ALTER TYPE

CLI should warn before execution.

---

## Week 7 — Migration Status + Verification

### Ticket: Implement status command

Command:

```
schemaforge status
```

### Ticket: Migration verification

Command:

```
schemaforge verify
```

Checks:

* migration history
* state.json integrity
* schema drift

---

## Week 8 — Down Migrations

### Ticket: Generate down migrations automatically

Files generated:

```
up.sql
down.sql
```

---

# Phase 3 — SQL / Database Import

## Week 9 — SQL → Schema Forge Import

### Ticket: SQL parser for schema import

Goal:
Allow importing an existing SQL schema into Schema Forge DSL.

Command:

```
schemaforge import sql schema.sql
```

Output:

```
schemaforge/schema.sf
```

### Ticket: SQL → AST converter

Convert SQL constructs into Schema Forge AST.

Support:

* CREATE TABLE
* columns
* primary keys
* foreign keys
* defaults
* indexes

### Ticket: AST → DSL writer

Convert parsed AST to `.sf` DSL file.

Example conversion

SQL

```
CREATE TABLE users (
 id uuid primary key,
 email text unique
);
```

DSL

```
table users {

 id uuid pk
 email text unique

}
```

---

## Week 10 — Live Database Introspection

### Ticket: Database schema introspector

Command:

```
schemaforge pull
```

Behavior:

* connect to database
* read schema metadata
* generate schema.sf

Sources:

* information_schema
* pg_catalog

---

# Phase 4 — Advanced Diff Intelligence

## Week 11 — Rename Detection

### Ticket: Column rename detection

Detect renames instead of drop/add operations.

Example:

```
email → user_email
```

---

## Week 12 — Migration Squash

### Ticket: Migration squash command

Command:

```
schemaforge squash
```

Combine many migrations into a baseline.

---

# Phase 5 — SQL Import Improvements

## Week 13 — Extended SQL Import

### Ticket: Import indexes from SQL

Support:

```
CREATE INDEX
CREATE UNIQUE INDEX
```

### Ticket: Import foreign keys

Support:

```
REFERENCES
ON DELETE
ON UPDATE
```

### Ticket: Import views

Parse:

```
CREATE VIEW
```

### Ticket: Import functions

Parse:

```
CREATE FUNCTION
```

---

# Phase 6 — Provider Architecture

## Week 14 — Provider abstraction

### Ticket: Define provider interface

Example:

```ts
interface Provider {
  name: string

  generateSQL(plan: MigrationPlan): SQLStatement[]

  introspectDatabase(connection): SchemaState

  normalizeSchema(ast: SchemaAST): ProviderSchema
}
```

### Ticket: Extract PostgreSQL provider

Move SQL generation to a dedicated provider package.

```
@schema-forge/provider-postgres
```

---

# Phase 7 — Multi‑Database Support

## Week 15–17 — MySQL Provider

Tickets:

* MySQL SQL generator
* MySQL schema introspector
* MySQL diff compatibility

---

## Week 18 — SQLite Provider

Implement SQLite provider for lightweight development environments.

---

# Final CLI Surface

```
schemaforge generate
schemaforge diff
schemaforge plan
schemaforge status
schemaforge verify
schemaforge squash

schemaforge pull
schemaforge import sql schema.sql

schemaforge format
schemaforge lint
```
