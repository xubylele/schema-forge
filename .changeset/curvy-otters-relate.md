---
"@xubylele/schema-forge": minor
---

Add nullability change detection to the diff engine and generate PostgreSQL ALTER COLUMN nullability migrations.

- Detect `nullable -> not null` and `not null -> nullable` transitions for existing columns
- Generate `ALTER TABLE ... ALTER COLUMN ... SET NOT NULL` and `DROP NOT NULL`
- Keep deterministic operation ordering when combined with type changes
- Normalize nullability state so missing `not null` is treated as nullable by default
- Extend unit and integration coverage for nullability diff and SQL generation
