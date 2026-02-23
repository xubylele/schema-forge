---
"@xubylele/schema-forge": minor
---

Refactor the release process to respect protected `main` branch rules.

- Remove automated commits and pushes to `main` from release workflows.
- Publish to npm only from `v*` tags via GitHub Actions.
- Keep PR validation with the required `Test` check before merge.
- Update release documentation for PR-first versioning and tag-based publishing.
