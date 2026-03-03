---
"@xubylele/schema-forge": minor
---

# ✨ feat(cli): implement global `--safe` flag to prevent destructive operations

- Added global `--safe` flag to CLI argument parser.
- Ensured flag is available across all commands.
- Propagated `safe` option through command execution context.
- Prepared foundation for blocking destructive operations (e.g. DROP, ALTER destructive cases).
- Added unit tests to validate flag parsing and context accessibility.
