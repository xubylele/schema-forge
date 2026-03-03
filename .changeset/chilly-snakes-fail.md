---
"@xubylele/schema-forge": minor
---

# ✨ feat(cli): enforce deterministic non-interactive safety behavior in CI environments

- Added explicit CI detection (`process.env.CI === "true"`).
- When a `DESTRUCTIVE` operation is detected in CI:
  - Immediately fail with exit code `3` unless `--force` is explicitly provided.
- Disabled all interactive confirmation prompts in CI mode.
- Ensured exit codes are deterministic and consistent across all commands.
- Updated CLI help output to document CI behavior and exit code semantics.
- Added unit and integration tests covering:
  - Destructive operations in CI without `--force`
  - Successful execution in CI with `--force`
  - Non-interactive enforcement guarantees
