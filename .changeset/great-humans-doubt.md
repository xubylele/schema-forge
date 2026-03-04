---
"@xubylele/schema-forge": minor
---

# SF-204

✨ feat(cli): add `doctor` command for live database drift detection

- Introduced new `doctor` command to detect drift between a live PostgreSQL database and the tracked `state.json`.
- Added support for PostgreSQL connection URL input.
- Added schema selection options for targeted drift checks.
- Implemented optional JSON output mode for CI pipelines and automation workflows.
- Documented command usage and exit code semantics in `README.md`.
- Added real PostgreSQL drift integration tests (Testcontainers locally, CI Postgres service in pipelines).
- Added deterministic JSON assertions for `doctor --json` and `validate --url --json` across schema creation orders.
- Wired CI to run drift integration tests against a real Postgres service with explicit health checks.
