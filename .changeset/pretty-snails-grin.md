---
"@xubylele/schema-forge": minor
---

✨ feat(validate): add `--force` option to validation command

- Allow `schema-forge validate` to bypass destructive change detection in CI when `--force` is used.
- Update exit code logic to return `1` instead of `3` in CI when destructive changes exist but `--force` is specified.
- Add tests covering validation behavior with and without the `--force` option.
- Update `README.md` to document the new validation command behavior.