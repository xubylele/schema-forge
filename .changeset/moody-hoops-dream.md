---
"@xubylele/schema-forge": minor
---

✨ feat(cli): add provider support to `schema-forge init`

- Allow `schema-forge init` to accept an optional provider argument (`postgres` or `supabase`), defaulting to `postgres`.
- Update initialization logic to generate provider-specific migration directories.
- Document provider options and project structure changes in `README.md`.
- Add tests to verify initialization behavior for both providers.
