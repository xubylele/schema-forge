---
"@xubylele/schema-forge": minor
---

# ✨ feat(safety): add interactive confirmation prompt for destructive operations

- Introduced prompt utility module for interactive yes/no confirmations.
- Integrated prompt flow with safety middleware reports.
- When operations are classified as `DESTRUCTIVE` and `--force` is not provided:
  - Display a summary of risky operations.
  - Require explicit user confirmation (yes/no) before continuing.
- Abort execution when the user declines confirmation.
- Automatically skip the prompt when `CI=true` (non-interactive environments).
- Added integration tests using mocked stdin to validate prompt behavior, decline abort, and CI bypass.
