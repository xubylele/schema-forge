# Changelog

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
