---
"@xubylele/schema-forge": minor
---

Add SQL migration import support with a lightweight PostgreSQL/Supabase DDL parser and a new `schema-forge import` command.

### Added

- New CLI command: `schema-forge import <path>`
  - Accepts a single `.sql` file or a migrations directory
  - Supports optional output override: `--out <path>`
- New SQL migration parser pipeline for supported DDL statements:
  - `CREATE TABLE` (columns + inline/table-level PK/UNIQUE)
  - `ALTER TABLE ... ADD COLUMN`
  - `ALTER TABLE ... ALTER COLUMN ... TYPE`
  - `ALTER TABLE ... ALTER COLUMN ... SET/DROP NOT NULL`
  - `ALTER TABLE ... ALTER COLUMN ... SET/DROP DEFAULT`
  - `ALTER TABLE ... ADD/DROP CONSTRAINT` (PK/UNIQUE)
  - `ALTER TABLE ... DROP COLUMN`
  - `DROP TABLE`
- Unsupported SQL is safely ignored and reported as parser warnings.
- Migration statement splitting now handles semicolons in string literals safely.

### Internal

- Added SQL import modules under `src/core/sql` for:
  - statement splitting
  - migration parsing into normalized operations
  - operation application to reconstruct schema state
  - migration file/directory loading
  - schema DSL serialization (`schema.sf` output)
- Added SQL parser and import command tests covering supported operations, warning behavior, and ordering.
- Updated README command documentation with `schema-forge import` usage.
