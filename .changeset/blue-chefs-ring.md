---
"@xubylele/schema-forge": minor
---

Add a new `schema-forge validate` command to detect destructive and risky schema changes before migration generation.

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
