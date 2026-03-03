---
"@xubylele/schema-forge": minor
---

# ✨ feat(cli): implement global `--force` flag to override safety restrictions

- Added global `--force` flag to CLI argument parser.
- Integrated flag into safety middleware layer.
- Allows explicit bypass of `--safe` restrictions when provided.
- Logs a clear warning message before executing potentially destructive operations.
- Ensures `--force` cannot be implicitly enabled in CI environments — must be explicitly passed.
- Added unit tests covering flag parsing, middleware behavior, and CI safeguards.
