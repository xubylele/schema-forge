---
"@xubylele/schema-forge": patch
---

♻️ Refactor: remove core validation and SQL generation logic, migrate to `schema-forge-core`.

- Deleted `validate.ts` and `validator.ts`, consolidating validation logic into `schema-forge-core`.
- Removed SQL generation logic from `sql-generator.ts`, now relying on `schema-forge-core` for SQL operations.
- Introduced `domain.ts` to manage types and functions interfacing with `schema-forge-core`.
- Updated imports across tests and source files to use the new `schema-forge-core` module.
- Adjusted Vitest configuration to resolve `schema-forge-core` paths correctly.
