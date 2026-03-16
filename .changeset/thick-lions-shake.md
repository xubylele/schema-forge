---
"@xubylele/schema-forge": minor
---

✨ feat(cli): add version notifier and changelog display

- Integrate `update-notifier` to alert users of new CLI versions (disabled in CI).
- Fetch and display changelog sections for the current version from GitHub.
- Add TypeScript declaration for `update-notifier`.
- Add tests for changelog extraction and version notification behavior.