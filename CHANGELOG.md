# Changelog

## 1.5.0

### Minor Changes

- 657c439: ### Summary

  This release strengthens the architectural boundaries between the CLI and `schema-forge-core`, and introduces provider resolution logic to better support multi-database strategies.

  ### Changes

  - Removed `validate.ts` and `validator.ts`, consolidating validation logic into `schema-forge-core`.
  - Removed SQL generation logic from `sql-generator.ts`, delegating SQL responsibilities to `schema-forge-core`.
  - Implemented provider resolution logic to dynamically determine and apply the configured database provider.
  - Updated related commands and tests to support provider-based execution flow.
  - Introduced `domain.ts` to encapsulate types and integration logic with `schema-forge-core`.
  - Updated all imports across source files and tests to use `schema-forge-core`.
  - Updated Vitest configuration to correctly resolve `schema-forge-core` paths.
  - Updated CI workflow names and trigger events for clarity and maintainability.
  - Bumped `@xubylele/schema-forge-core` to `1.0.4`.
  - Improved consistency and structure across command files and test imports.

  ### Impact

  - CLI now acts strictly as an orchestration layer.
  - Core domain and SQL responsibilities are fully centralized in `schema-forge-core`.
  - Provider resolution enables future multi-database expansion.
  - Improved internal consistency and long-term maintainability.

### Patch Changes

- 657c439: ♻️ Refactor: remove core validation and SQL generation logic, migrate to `schema-forge-core`.

  - Deleted `validate.ts` and `validator.ts`, consolidating validation logic into `schema-forge-core`.
  - Removed SQL generation logic from `sql-generator.ts`, now relying on `schema-forge-core` for SQL operations.
  - Introduced `domain.ts` to manage types and functions interfacing with `schema-forge-core`.
  - Updated imports across tests and source files to use the new `schema-forge-core` module.
  - Adjusted Vitest configuration to resolve `schema-forge-core` paths correctly.

## 1.4.0

### Minor Changes

- b42c4fa: Add a new `schema-forge validate` command to detect destructive and risky schema changes before migration generation.

  ### Added

  - New CLI command: `schema-forge validate`
  - Optional machine-readable output: `schema-forge validate --json`
  - Destructive/risky change detection rules for:
    - dropped tables (`DROP_TABLE`, error)
    - dropped columns (`DROP_COLUMN`, error)
    - type changes (`ALTER_COLUMN_TYPE`, warning/error using compatibility heuristics)
    - nullable -> not null (`SET_NOT_NULL`, warning)
  - CI-friendly exit behavior:
    - exits `1` when any error finding exists
    - exits `0` when only warnings/no findings exist

  ### Internal

  - Added core validation module for destructive-change analysis
  - Added dedicated tests for validator rules and validate command output/exit codes
  - Updated README command documentation for `validate`

- 0ee64eb: Add SQL migration import support with a lightweight PostgreSQL/Supabase DDL parser and a new `schema-forge import` command.

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

## 1.3.0

### Minor Changes

- 03ed47b: Add nullability change detection to the diff engine and generate PostgreSQL ALTER COLUMN nullability migrations.

  - Detect `nullable -> not null` and `not null -> nullable` transitions for existing columns
  - Generate `ALTER TABLE ... ALTER COLUMN ... SET NOT NULL` and `DROP NOT NULL`
  - Keep deterministic operation ordering when combined with type changes
  - Normalize nullability state so missing `not null` is treated as nullable by default
  - Extend unit and integration coverage for nullability diff and SQL generation

### Patch Changes

- 8778ee5: Add deterministic default value change detection in the diff engine and generate PostgreSQL default migrations.

  - Detects default value changes on existing columns (`added`, `removed`, `modified`) by diffing `schema.sf` vs `state.json`.
  - Adds normalization for default expressions to avoid obvious false positives (e.g. `NOW()` vs `now()`, whitespace-only differences).
  - Generates `ALTER TABLE ... ALTER COLUMN ... SET DEFAULT ...;` and `ALTER TABLE ... ALTER COLUMN ... DROP DEFAULT;`.
  - Improves parser handling for default expressions that include spaces.
  - Adds unit and integration coverage for default-change detection and SQL output.

- cb0cd02: Add deterministic constraint diffing for UNIQUE and PRIMARY KEY changes.

  - Detect column-level `unique` add/remove changes for existing columns.
  - Detect table primary key add/remove/change and emit deterministic drop/add operations.
  - Generate PostgreSQL/Supabase SQL using deterministic names:
    - `pk_<table>` for primary key constraints
    - `uq_<table>_<column>` for unique constraints
  - Add compatibility drop fallbacks for legacy PostgreSQL names (`<table>_pkey`, `<table>_<column>_key`).
  - Update README and test coverage for constraint diffing, SQL generation, and deterministic output.

## 1.2.0

### Minor Changes

- 253bca8: feat(diff): detect column type changes and generate ALTER COLUMN TYPE migrations

  The Diff Engine now detects column type changes between the previous state (`state.json`) and the current schema definition (`schema.sf`).

  When a column type is modified, Schema Forge generates the corresponding PostgreSQL migration:

  ```sql
  ALTER TABLE "table_name" ALTER COLUMN "column_name" TYPE "new_type";
  ```

  ### Added

  - COLUMN_TYPE_CHANGED diff operation
  - SQL generation for ALTER COLUMN TYPE
  - Type normalization before comparison (case-insensitive, trimmed)
  - Unit tests covering:
    - varchar → text
    - int → bigint
    - numeric precision changes

  ### Impact

  This improves determinism and trust in the declarative workflow by ensuring type modifications are properly migrated.

### Patch Changes

- 0e71914: Improve CLI output UX with a reusable themed output utility.

  - Add styled terminal output using `chalk` and `boxen` with a centralized Schema Forge theme.
  - Use boxed success messages and consistent `info`/`warning`/`error` formatting across CLI commands.
  - Update command messaging references to `schema-forge` for consistency.
  - Ensure output degrades safely in non-interactive terminals.

## 1.1.1

### Patch Changes

- Refactor the npm publish workflow to streamline release execution.

  - Simplify workflow steps in `publish.yml`.
  - Keep publishing triggered by `v*` tags.
  - Align authentication with Trusted Publishing (OIDC) setup.

## 1.1.0

### Minor Changes

- fefaa52: Refactor the release process to respect protected `main` branch rules.

  - Remove automated commits and pushes to `main` from release workflows.
  - Publish to npm only from `v*` tags via GitHub Actions.
  - Keep PR validation with the required `Test` check before merge.
  - Update release documentation for PR-first versioning and tag-based publishing.

### Patch Changes

- 7257436: "@xubylele/schema-forge": patch

  - Fix release workflow to use trusted publishers instead of npm token

  - Update the release workflow to leverage OpenID Connect (OIDC) trusted publishers for npm authentication, removing dependency on static npm tokens for improved security and automated credential management.

## 1.0.0

### Major Changes

- fdb9363: Migrated package to scoped namespace @xubylele/schema-forge

  The package name "schema-forge" is already taken on npm, so we've migrated to a scoped package under @xubylele/schema-forge.

  **Breaking Change:**

  - Install command changed from `npm install -g schema-forge` to `npm install -g @xubylele/schema-forge`
  - npx command changed from `npx schema-forge` to `npx @xubylele/schema-forge`

  **No Breaking Changes:**

  - The CLI command remains `schemaforge` (no change for users who already have it installed)
  - All functionality and APIs remain the same

  **Migration Steps:**

  1. Uninstall old package: `npm uninstall -g schema-forge`
  2. Install new package: `npm install -g @xubylele/schema-forge`
  3. Continue using `schemaforge` commands as before

## 0.3.1

### Patch Changes

- 16b8e7d: Fix: Improve schema validation and error handling

  This patch includes bug fixes and improvements to the core schema validation logic to ensure better reliability and clearer error messages for users.

## 0.3.0

### Minor Changes

- b303df3: Streamlined release process
- releases now happen automatically within a few minutes of merging PRs, without intermediate version PRs

### Patch Changes

- c998cea: # Fix NPM Token

## 0.2.0

### Minor Changes

- Initial release of SchemaForge CLI

All notable changes to this project will be documented in this file.
