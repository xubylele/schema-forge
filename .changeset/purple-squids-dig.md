---
"@xubylele/schema-forge": minor
---

### Summary

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
