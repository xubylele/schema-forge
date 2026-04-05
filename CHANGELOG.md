# Changelog

## 1.13.0

### Minor Changes

- 146f249: ✨ feat: add plan and preview commands for migration operations

  - Add `schema-forge plan` to print human-readable migration plan lines (`+` create, `~` modify, `-` delete) from schema diffs.
  - Add `schema-forge preview` as an alias flow for plan preview.
  - Expose new `plan` and `preview` programmatic API functions.
  - Extend README command docs and DSL sections with index and view support details.
  - Add CLI tests covering plan/preview behavior, including index and view operations and flag validation.

## 1.12.2

### Patch Changes

- 58c4f44: 📝 docs: update roadmap with completed tasks and status for upcoming features

## 1.12.1

### Patch Changes

- f48cd1a: 📝 docs: enhance RLS policy documentation and update core dependency

  - Improve RLS policy documentation in `README.md` with detailed command options and examples.
  - Update validation requirements to reflect new policy command support.
  - Bump `@xubylele/schema-forge-core` to `1.5.0` in `package.json` and `package-lock.json`.

## 1.12.0

### Minor Changes

- 944520d: ✨ feat(cli): add version notifier and changelog display

  - Integrate `update-notifier` to alert users of new CLI versions (disabled in CI).
  - Fetch and display changelog sections for the current version from GitHub.
  - Add TypeScript declaration for `update-notifier`.
  - Add tests for changelog extraction and version notification behavior.

### Patch Changes

- 944520d: ⬆️ chore(deps): update core version and improve documentation

  - Bump `@xubylele/schema-forge-core` from `1.3.1` to `1.4.0`.
  - Update `README.md` with Row Level Security (RLS) policy support details and examples.
  - Update GitHub Actions to `actions/checkout@v5` and `actions/setup-node@v5`.

## 1.11.0

### Minor Changes

- d8c99b0: ✨ feat(generate): add migration file name format option

  - Add `--migration-format` option to the `generate` command to control migration file naming.
  - Support `hyphen` (default) and `underscore` (Supabase CLI style) formats.
  - Update `init` command to configure the default format when using the Supabase provider.
  - Add utilities to generate migration file names based on the selected format.
  - Update `README.md` with documentation for the new option.
  - Add integration tests verifying migration file naming behavior.

- d8c99b0: ✨ feat(config): add command to configure migration file name format

  - Add `config` command to update settings in `schemaforge/config.json`.
  - Allow users to set the migration file name format to `hyphen` or `underscore`.
  - Update `README.md` to document the new command and usage without manual config editing.

## 1.10.1

### Patch Changes

- a64a983: 📝 docs(roadmap): mark Phase 3 — Developer Experience as completed

  - Mark Phase 3 as completed in the roadmap.
  - Update feature list to include visual diff support.
  - Add schema status indicator to the roadmap items.

## 1.10.0

### Minor Changes

- 2a891f5: ✨ feat(validate): add `--force` option to validation command

  - Allow `schema-forge validate` to bypass destructive change detection in CI when `--force` is used.
  - Update exit code logic to return `1` instead of `3` in CI when destructive changes exist but `--force` is specified.
  - Add tests covering validation behavior with and without the `--force` option.
  - Update `README.md` to document the new validation command behavior.

## 1.9.0

### Minor Changes

- c80586f: ✨ feat(cli): add provider support to `schema-forge init`

  - Allow `schema-forge init` to accept an optional provider argument (`postgres` or `supabase`), defaulting to `postgres`.
  - Update initialization logic to generate provider-specific migration directories.
  - Document provider options and project structure changes in `README.md`.
  - Add tests to verify initialization behavior for both providers.

## 1.8.1

### Patch Changes

- 55c9bdc: ⬆️ chore: update dependencies and documentation

  - Bump `@xubylele/schema-forge-core` to `1.3.1`.
  - Update homepage URL in `package.json` to `https://schemaforge.xuby.cl/`.
  - Update `README.md` to reflect the new website link.

## 1.8.0

### Minor Changes

- cc2a7d5: ✨ feat(api): introduce programmatic API and enhance exit code documentation

  - Added a new programmatic API in `src/api.ts` for integrating Schema Forge into Node.js applications.
  - Updated `package.json` to include exports for the new API.
  - Enhanced exit code documentation in `README.md` and added a machine-readable exit code contract in `docs/exit-codes.json`.
  - Improved the build script to compile both CLI and API files.
  - Added tests for the new API functionality in `test/api.test.ts` to ensure reliability and correctness.

## 1.7.0

### Minor Changes

- 6cac56f: ✨ feat(cli): add `doctor` command for live database drift detection

  - Introduced new `doctor` command to detect drift between a live PostgreSQL database and the tracked `state.json`.
  - Added support for PostgreSQL connection URL input.
  - Added schema selection options for targeted drift checks.
  - Implemented optional JSON output mode for CI pipelines and automation workflows.
  - Documented command usage and exit code semantics in `README.md`.
  - Added real PostgreSQL drift integration tests (Testcontainers locally, CI Postgres service in pipelines).
  - Added deterministic JSON assertions for `doctor --json` and `validate --url --json` across schema creation orders.
  - Wired CI to run drift integration tests against a real Postgres service with explicit health checks.

- 6cac56f: ✨ feat(cli): add live PostgreSQL introspection and drift validation

  - Added new `introspect` command to extract a normalized schema from a live PostgreSQL database.
  - Extended `diff` and `validate` commands to support live database comparison via connection URL.
  - Live `validate --url --json` now returns a structured DriftReport (`missingTables`, `extraTables`, `columnDifferences`, `typeMismatches`).
  - Introduced CLI options to specify target schemas during introspection and validation.
  - Integrated live introspection flow with existing diff engine for drift detection.
  - Updated dependencies for PostgreSQL client compatibility.
  - Improved `README.md` documentation with usage examples and connection configuration guidance.

## 1.6.1

### Patch Changes

- 55c3995: # 🚑 hotfix(cli): add shebang to CLI entry point for improved execution in Node.js environments

## 1.6.0

### Minor Changes

- 0069ffd: # ✨ feat(safety): add interactive confirmation prompt for destructive operations

  - Introduced prompt utility module for interactive yes/no confirmations.
  - Integrated prompt flow with safety middleware reports.
  - When operations are classified as `DESTRUCTIVE` and `--force` is not provided:
    - Display a summary of risky operations.
    - Require explicit user confirmation (yes/no) before continuing.
  - Abort execution when the user declines confirmation.
  - Automatically skip the prompt when `CI=true` (non-interactive environments).
  - Added integration tests using mocked stdin to validate prompt behavior, decline abort, and CI bypass.

- 4057636: # ✨ feat(cli): enforce deterministic non-interactive safety behavior in CI environments

  - Added explicit CI detection (`process.env.CI === "true"`).
  - When a `DESTRUCTIVE` operation is detected in CI:
    - Immediately fail with exit code `3` unless `--force` is explicitly provided.
  - Disabled all interactive confirmation prompts in CI mode.
  - Ensured exit codes are deterministic and consistent across all commands.
  - Updated CLI help output to document CI behavior and exit code semantics.
  - Added unit and integration tests covering:
    - Destructive operations in CI without `--force`
    - Successful execution in CI with `--force`
    - Non-interactive enforcement guarantees

- fc232e2: # 🧪 test(safety): implement comprehensive test matrix for safety combinations

  - Added full safety behavior matrix coverage:
    - `--safe` ON + destructive operation
    - `--safe` OFF + destructive operation
    - `--safe` + `--force`
    - `CI=true` + destructive operation
    - `CI=true` + `--force`
  - Verified deterministic exit codes for each scenario.
  - Added snapshot tests for standardized error and warning output.
  - Ensured middleware, CLI layer, and CI enforcement paths are fully covered.
  - Achieved 100% coverage for safety-related logic (classifier, middleware, prompt, and CI handling).

- 6d7e667: # ✨ feat(cli): standardize global exit codes across all commands

  - Defined global exit code contract:
    - `0` → Success
    - `1` → Validation error
    - `2` → Drift detected (reserved for future use)
    - `3` → Unsafe destructive change
  - Centralized exit code handling to ensure consistency across CLI commands.
  - Updated command execution flow to return standardized codes instead of ad-hoc exits.
  - Aligned safety middleware and CI behavior with the new exit code contract.
  - Added CLI integration tests to verify deterministic and consistent exit codes.

- aec8944: # ✨ feat(cli): implement global `--force` flag to override safety restrictions

  - Added global `--force` flag to CLI argument parser.
  - Integrated flag into safety middleware layer.
  - Allows explicit bypass of `--safe` restrictions when provided.
  - Logs a clear warning message before executing potentially destructive operations.
  - Ensures `--force` cannot be implicitly enabled in CI environments — must be explicitly passed.
  - Added unit tests covering flag parsing, middleware behavior, and CI safeguards.

- 9f42177: # ✨ feat(cli): implement global `--safe` flag to prevent destructive operations

  - Added global `--safe` flag to CLI argument parser.
  - Ensured flag is available across all commands.
  - Propagated `safe` option through command execution context.
  - Prepared foundation for blocking destructive operations (e.g. DROP, ALTER destructive cases).
  - Added unit tests to validate flag parsing and context accessibility.

## 1.5.2

### Patch Changes

- 9346c69: # Chore: update @xubylele/schema-forge-core dependency to version 1.1.0

  - Updated @xubylele/schema-forge-core to v1.1.0 in package.json and package-lock.json
  - Ensured compatibility with latest core improvements

## 1.5.1

### Patch Changes

- 3986c45: # Refactor: update schema-forge-core dependency to version 1.0.5 and adjust README

  - Updated @xubylele/schema-forge-core dependency to v1.0.5
  - Adjusted README to reflect latest changes and usage

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
