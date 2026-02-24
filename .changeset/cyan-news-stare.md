---
"@xubylele/schema-forge": patch
---

Add deterministic default value change detection in the diff engine and generate PostgreSQL default migrations.

- Detects default value changes on existing columns (`added`, `removed`, `modified`) by diffing `schema.sf` vs `state.json`.
- Adds normalization for default expressions to avoid obvious false positives (e.g. `NOW()` vs `now()`, whitespace-only differences).
- Generates `ALTER TABLE ... ALTER COLUMN ... SET DEFAULT ...;` and `ALTER TABLE ... ALTER COLUMN ... DROP DEFAULT;`.
- Improves parser handling for default expressions that include spaces.
- Adds unit and integration coverage for default-change detection and SQL output.
