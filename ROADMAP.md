# Schema Forge — Free Features & Multi‑Engine Roadmap

## Strategic Goals

1. Make Schema Forge the best migration CLI for PostgreSQL / Supabase.
2. Expand the DSL to cover most database schema constructs.
3. Enable importing existing databases (SQL or live DB) to accelerate adoption.
4. Introduce a provider architecture to support multiple database engines.

---

## Already Shipped (Completed)

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

* Website: docs + playground ✅; login/signup + CLI login page 📌 Planned (after free-tier milestones)
* Schema Forge Cloud: auth + device login for CLI ✅
* GitHub Action: validate/doctor/diff + PR comment preview ✅

---

## Phase 1 — PostgreSQL Schema Coverage

## Week 1 — Policies (RLS) ✅

### Ticket: DSL support for policies

Goal: Add PostgreSQL RLS policy support to the DSL.

Tasks:

* ✅ Add PolicyNode to AST
* ✅ Extend parser
* ✅ Add diff detection
* ✅ Add SQL generator

Example DSL

```sql
policy "Users can read themselves" on users
for select
using auth.uid() = id
```

---

## Week 2 — Views + Indexes

### Ticket: DSL support for views

Status: ⏳ Pending

Tasks:

* Add ViewNode to AST
* Parser support
* Diff detection
* SQL generation

### Ticket: DSL support for indexes

Status: ⏳ Pending

Support:

* unique
* partial
* expression indexes

Example DSL

```sql
index users_email_idx on users(email)
```

---

## Week 3 — Functions

### Ticket: DSL support for functions

Status: ⏳ Pending

Tasks:

* AST node
* parser support
* function body hashing
* SQL generation
* diff detection

Example DSL

```sql
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

Status: ⏳ Pending

Example DSL

```sql
trigger update_timestamp
before update on users
for each row
execute function update_updated_at()
```

---

## Phase 2 — Migration Engine Improvements

## Week 5 — Migration Planner

### Ticket: Implement migration planner

Command:

```bash
schemaforge plan
```

Output example:

```bash
+ create table posts
+ add column avatar_url
~ modify column email type
```

---

## Week 6 — Migration Safety Checks ✅

### Ticket: Detect destructive migrations

Status: ✅ Completed

Detect:

* DROP TABLE
* DROP COLUMN
* ALTER TYPE

CLI should warn before execution.

Delivered in current CLI via destructive-change detection, `--safe` / `--force`, and CI exit-code behavior.

---

## Week 7 — Migration Status + Verification

### Ticket: Implement status command

Status: ⏳ Pending

Command:

```bash
schemaforge status
```

### Ticket: Migration verification

Status: ⏳ Pending

Command:

```bash
schemaforge verify
```

Checks:

* migration history
* state.json integrity
* schema drift

---

## Week 8 — Down Migrations

### Ticket: Generate down migrations automatically

Status: ⏳ Pending

Files generated:

```bash
up.sql
down.sql
```

---

## Phase 3 — SQL / Database Import

## Week 9 — SQL → Schema Forge Import 🟡

### Ticket: SQL parser for schema import

Status: ✅ Completed (baseline import flow)

Goal:
Allow importing an existing SQL schema into Schema Forge DSL.

Command:

```bash
schemaforge import sql schema.sql
```

Output:

```bash
schemaforge/schema.sf
```

### Ticket: SQL → AST converter

Status: 🟡 Partially completed (baseline DDL support shipped; extended coverage continues in later phases)

Convert SQL constructs into Schema Forge AST.

Support:

* CREATE TABLE
* columns
* primary keys
* foreign keys
* defaults
* indexes

### Ticket: AST → DSL writer

Status: ✅ Completed (schema output generation shipped)

Convert parsed AST to `.sf` DSL file.

Example conversion

SQL

```sql
CREATE TABLE users (
 id uuid primary key,
 email text unique
);
```

DSL

```sql
table users {
 id uuid pk
 email text unique
}
```

---

## Week 10 — Live Database Introspection ✅

### Ticket: Database schema introspector

Status: ✅ Completed

Command (current):

```bash
schemaforge introspect
```

Behavior:

* connect to database
* read schema metadata
* generate schema.sf

Sources:

* information_schema
* pg_catalog

---

## Phase 4 — Advanced Diff Intelligence

## Week 11 — Rename Detection

### Ticket: Column rename detection

Status: ⏳ Pending

Detect renames instead of drop/add operations.

Example:

```bash
email → user_email
```

---

## Week 12 — Migration Squash

### Ticket: Migration squash command

Status: ⏳ Pending

Command:

```bash
schemaforge squash
```

Combine many migrations into a baseline.

---

## Phase 5 — SQL Import Improvements

## Week 13 — Extended SQL Import

### Ticket: Import indexes from SQL

Status: ⏳ Pending

Support:

```sql
CREATE INDEX
CREATE UNIQUE INDEX
```

### Ticket: Import foreign keys

Status: ⏳ Pending

Support:

```sql
REFERENCES
ON DELETE
ON UPDATE
```

### Ticket: Import views

Status: ⏳ Pending

Parse:

```sql
CREATE VIEW
```

### Ticket: Import functions

Status: ⏳ Pending

Parse:

```sql
CREATE FUNCTION
```

---

## Phase 6 — Provider Architecture

## Week 14 — Provider abstraction

### Ticket: Define provider interface

Status: 🟡 Partially completed (provider concept exists, full abstraction still pending)

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

Status: ⏳ Pending

Move SQL generation to a dedicated provider package.

```ts
import * from '@schema-forge/provider-postgres'
```

---

## Phase 7 — Multi‑Database Support

## Week 15–17 — MySQL Provider

Tickets:

* ⏳ MySQL SQL generator
* ⏳ MySQL schema introspector
* ⏳ MySQL diff compatibility

---

## Week 18 — SQLite Provider

Status: ⏳ Pending

Implement SQLite provider for lightweight development environments.

---

## Final CLI Surface

```bash
schemaforge generate
schemaforge diff
schemaforge validate
schemaforge doctor
schemaforge introspect
schemaforge import <path>

# Planned
schemaforge plan
schemaforge status
schemaforge verify
schemaforge squash
schemaforge pull
schemaforge format
schemaforge lint

# Legacy roadmap notation
schemaforge import sql schema.sql
```
