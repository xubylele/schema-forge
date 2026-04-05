---
"@xubylele/schema-forge": minor
---

✨ feat: add plan and preview commands for migration operations

- Add `schema-forge plan` to print human-readable migration plan lines (`+` create, `~` modify, `-` delete) from schema diffs.
- Add `schema-forge preview` as an alias flow for plan preview.
- Expose new `plan` and `preview` programmatic API functions.
- Extend README command docs and DSL sections with index and view support details.
- Add CLI tests covering plan/preview behavior, including index and view operations and flag validation.
