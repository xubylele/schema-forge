---
"@xubylele/schema-forge": minor
---

# ✨ feat(cli): standardize global exit codes across all commands

- Defined global exit code contract:
  - `0` → Success
  - `1` → Validation error
  - `2` → Drift detected (reserved for future use)
  - `3` → Unsafe destructive change
- Centralized exit code handling to ensure consistency across CLI commands.
- Updated command execution flow to return standardized codes instead of ad-hoc exits.
- Aligned safety middleware and CI behavior with the new exit code contract.
- Added CLI integration tests to verify deterministic and consistent exit codes.
