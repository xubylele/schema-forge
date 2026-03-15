---
"@xubylele/schema-forge": minor
---

✨ feat(generate): add migration file name format option

- Add `--migration-format` option to the `generate` command to control migration file naming.
- Support `hyphen` (default) and `underscore` (Supabase CLI style) formats.
- Update `init` command to configure the default format when using the Supabase provider.
- Add utilities to generate migration file names based on the selected format.
- Update `README.md` with documentation for the new option.
- Add integration tests verifying migration file naming behavior.