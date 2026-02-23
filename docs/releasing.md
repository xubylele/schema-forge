# Releasing Schema Forge

This document describes the release flow with protected `main` and npm publication based on tags.

## Repository Rules

- All changes must go through Pull Requests to `main`.
- Direct commits to `main` from workflows are not allowed.
- The required status check is the **Test** job from the CI workflow.

## Recommended Flow

### 1) Development and PR

1. Create a branch from `main`.
2. Implement changes.
3. Add changeset:

  ```bash
  npx changeset
  ```

1. Open PR to `main`.
2. Wait for CI (job `Test`) to pass.

### 2) Versioning (before merge)

Version bump and changelog must be included in the PR being merged, or done manually before tagging.

Options:

- With Changesets (recommended):

  ```bash
  npx changeset version
  ```

  This updates `package.json` and `CHANGELOG.md`.

- Manual (if applicable): update version/changelog explicitly before creating the tag.

Then, commit these changes in the PR branch and merge to `main` via PR.

### 3) Publication by Tag

Publishing to npm is triggered by pushing tags matching `v*` using `.github/workflows/publish.yml`.

```bash
# Ensure you are on the correct commit in main
VERSION=$(node -p "require('./package.json').version")
git tag "v$VERSION"
git push origin "v$VERSION"
```

When the tag is pushed, the workflow executes:

1. `npm ci`
2. `npm run build`
3. `npm publish --access public`

## Workflows

- `.github/workflows/ci.yml`
  - Trigger: `pull_request` to `main`
  - Job name: `Test` (required check)
  - Steps: `npm ci`, `npm test` (if exists), `npm run build`

- `.github/workflows/release-on-main.yml`
  - Trigger: `push` to `main`
  - Validation and preparation messages only
  - Does not perform `git commit` or `git push origin main`

- `.github/workflows/publish.yml`
  - Trigger: `push` of tags matching `v*`
  - Publishes to npm with Trusted Publishing (OIDC)

## Required npm Configuration

Configure Trusted Publishing for your package on npm for this repository/workflow.

In GitHub Actions, the workflow uses `id-token: write` for OIDC exchange; it does not require `NPM_TOKEN`.

## If You Use 2FA on npm

- Trusted Publishing avoids the use of publish tokens and does not require interactive OTP in CI.
- If your policy requires manual publishing, maintain this flow and run publish manually locally after creating the tag.

## Release Checklist

1. PR with changes + changeset/versioning.
2. CI `Test` passing.
3. Merge PR to `main`.
4. Create and push tag `vX.Y.Z`.
5. Verify `publish.yml` execution and release on npm.
