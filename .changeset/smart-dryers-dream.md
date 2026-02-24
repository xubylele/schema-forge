---
"@xubylele/schema-forge": patch
---

Improve CLI output UX with a reusable themed output utility.

- Add styled terminal output using `chalk` and `boxen` with a centralized Schema Forge theme.
- Use boxed success messages and consistent `info`/`warning`/`error` formatting across CLI commands.
- Update command messaging references to `schema-forge` for consistency.
- Ensure output degrades safely in non-interactive terminals.
