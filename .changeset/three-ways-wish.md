---
"@xubylele/schema-forge": patch
---

Add deterministic constraint diffing for UNIQUE and PRIMARY KEY changes.

- Detect column-level `unique` add/remove changes for existing columns.
- Detect table primary key add/remove/change and emit deterministic drop/add operations.
- Generate PostgreSQL/Supabase SQL using deterministic names:
  - `pk_<table>` for primary key constraints
  - `uq_<table>_<column>` for unique constraints
- Add compatibility drop fallbacks for legacy PostgreSQL names (`<table>_pkey`, `<table>_<column>_key`).
- Update README and test coverage for constraint diffing, SQL generation, and deterministic output.
