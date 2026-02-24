---
"@xubylele/schema-forge": minor
---

feat(diff): detect column type changes and generate ALTER COLUMN TYPE migrations

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
