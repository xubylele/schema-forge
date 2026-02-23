---
"@xubylele/schema-forge": major
---

Migrated package to scoped namespace @xubylele/schema-forge

The package name "schema-forge" is already taken on npm, so we've migrated to a scoped package under @xubylele/schema-forge.

**Breaking Change:**

- Install command changed from `npm install -g schema-forge` to `npm install -g @xubylele/schema-forge`
- npx command changed from `npx schema-forge` to `npx @xubylele/schema-forge`

**No Breaking Changes:**

- The CLI command remains `schemaforge` (no change for users who already have it installed)
- All functionality and APIs remain the same

**Migration Steps:**

1. Uninstall old package: `npm uninstall -g schema-forge`
2. Install new package: `npm install -g @xubylele/schema-forge`
3. Continue using `schemaforge` commands as before
