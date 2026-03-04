---
"@xubylele/schema-forge": minor
---

✨ feat(cli): add live PostgreSQL introspection and drift validation

- Added new `introspect` command to extract a normalized schema from a live PostgreSQL database.
- Extended `diff` and `validate` commands to support live database comparison via connection URL.
- Introduced CLI options to specify target schemas during introspection and validation.
- Integrated live introspection flow with existing diff engine for drift detection.
- Updated dependencies for PostgreSQL client compatibility.
- Improved `README.md` documentation with usage examples and connection configuration guidance.
