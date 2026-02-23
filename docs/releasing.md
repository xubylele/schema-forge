# Releasing Schema Forge

This document explains how Schema Forge handles versioning and publishing to npm using automated workflows with Changesets.

## Overview

Schema Forge uses [Changesets](https://github.com/changesets/changesets) for managing releases. The process is fully automated through GitHub Actions: when you merge a PR with changesets to `main`, the release workflow automatically versions, commits, tags, and publishes to npm in a single automated flow.

**No manual intervention required** - no version bumps, no publishing commands, no intermediate PRs.

## The Release Flow

### Step 1: Developer Makes Changes

When working on a feature or bug fix:

1. Create a feature branch from `main`
2. Make your code changes
3. Add a changeset by running:

   ```bash
   npx changeset
   ```

4. Select the appropriate version bump type:
   - **patch**: Bug fixes, small improvements (0.1.0 → 0.1.1)
   - **minor**: New features, backwards-compatible (0.1.0 → 0.2.0)
   - **major**: Breaking changes (0.1.0 → 1.0.0)
5. Write a clear summary of the changes
6. Commit both your code changes and the `.changeset/<hash>.md` file
7. Open a pull request

### Step 2: CI Validates the PR

Once the PR is opened:

- The CI workflow (`.github/workflows/ci.yml`) runs automatically
- It installs dependencies, builds the project, and runs tests
- The PR cannot be merged until CI passes

### Step 3: Merge to Main

When the PR is approved and merged to `main`:

- The release workflow (`.github/workflows/release-on-main.yml`) is triggered automatically
- It detects the changeset files in the repository

### Step 4: Automated Release

The release workflow automatically performs all release steps in sequence:

1. **Anti-loop Guard**: Checks the last commit message
   - If it contains "chore(release): version packages", exits immediately to prevent infinite loops
   - This ensures the workflow doesn't trigger itself

2. **Changeset Detection**: Scans for changeset files
   - If no changesets are found (excluding README.md), exits gracefully
   - This allows non-release commits to go through without triggering a release

3. **Version Bump**: Runs `npx changeset version` to:
   - Update `version` field in `package.json`
   - Generate/update `CHANGELOG.md` with all changes
   - Remove consumed changeset files

4. **Commit Changes**: If there are changes:
   - Configures git with `github-actions[bot]` as the committer
   - Commits all changes with message: `chore(release): version packages`
   - Pushes directly to `main`

5. **Create Git Tag**:
   - Reads the new version from `package.json`
   - Creates a tag like `v0.2.1`
   - Validates the tag doesn't already exist (fails if duplicate)
   - Pushes the tag to GitHub

6. **Publish to npm**:
   - Configures npm authentication using `NPM_TOKEN` secret
   - Runs `npm publish --access public`
   - Package is live on npm! 🎉

**Total time:** Typically completes within 2-3 minutes of merging to `main`.

## Working with Changesets

### Creating a Changeset

```bash
npx changeset
```

This interactive command will:

1. Ask which packages changed (just press Enter in this single-package repo)
2. Ask for the bump type (patch/minor/major)
3. Ask for a summary (markdown supported)
4. Create a `.changeset/<random-hash>.md` file

### Changeset File Format

The generated changeset file looks like:

```markdown
---
"schema-forge": patch
---

Fixed SQL generation for array fields
```

Commit this file with your changes!

### Multiple Changesets

If your PR has multiple logical changes, you can add multiple changesets:

```bash
npx changeset  # First change
npx changeset  # Second change
```

All changesets in your PR will be combined when the release runs.

## Hotfix Process

For urgent fixes that need immediate release:

1. Create a branch from `main`
2. Make the fix
3. Run `npx changeset` and select **patch**
4. Open a PR marked as hotfix/urgent
5. Once merged to `main`, automation handles everything
6. The fix is published to npm within 2-3 minutes

**No manual steps required** - just merge and wait!

## Initial Setup for Maintainers

### Repository Configuration

The automated release workflow requires specific GitHub repository settings:

#### Step 1: Enable Write Permissions for GitHub Actions

1. Go to your GitHub repository
2. Navigate to **Settings** → **Actions** → **General**
3. Scroll to **Workflow permissions**
4. Select **Read and write permissions**
5. Check **Allow GitHub Actions to create and approve pull requests** (optional, but recommended)
6. Click **Save**

This allows the workflow to:

- Commit version changes to `main`
- Push git tags
- Create releases (if extended in the future)

#### Step 2: Configure NPM_TOKEN Secret

The release workflow requires an npm authentication token to publish packages:

##### Generate npm Token

1. Log in to [npmjs.com](https://www.npmjs.com/)
2. Go to **Account Settings** → **Access Tokens**
3. Click **Generate New Token**
4. Select **Automation** type (recommended for CI/CD)
5. Copy the generated token (you won't see it again!)

##### Add Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: Paste the token from npm
6. Click **Add secret**

That's it! The release workflow will now be able to publish to npm.

## Troubleshooting

### No Release Triggered After Merge

**Possible causes:**

- **No changesets found**: Verify there are `.changeset/*.md` files (excluding README.md)
- **Last commit is a release commit**: If someone manually pushed a "chore(release)" commit, the guard prevents loops
- **CI not enabled**: Check GitHub Actions is enabled in repository settings
- **Workflow file issues**: Verify `.github/workflows/release-on-main.yml` exists and is valid

**Solution:** Check GitHub Actions tab for workflow run logs to see which guard triggered.

### Publish Fails with Authentication Error

**Possible causes:**

- `NPM_TOKEN` secret not configured or expired
- npm token lacks publish permissions
- Package name collision on npm (already taken by another package)

**Solution:**

- Verify `NPM_TOKEN` secret exists in repository settings
- Regenerate npm token and update secret if expired
- Ensure token has "Automation" or "Publish" permission level
- Check package name availability on npmjs.com

### Version Tag Already Exists

**Error message:** `Error: Tag v0.2.1 already exists!`

**Cause:** The workflow tries to create a tag that already exists in the repository.

**Solution:**

1. Check if someone manually created the tag
2. If the tag is incorrect, delete it: `git tag -d v0.2.1 && git push origin :refs/tags/v0.2.1`
3. Re-run the workflow or push a new commit to trigger it again

### Commit Loop Detected

**Symptom:** Workflow exits immediately with "Release commit detected. Skipping to prevent loop."

**Cause:** This is **expected behavior** when the workflow commits version changes. The anti-loop guard prevents the workflow from triggering on its own commits.

**Solution:** No action needed - this is working as designed.

### Changes Not Committed to Main

**Symptom:** Workflow runs but no version bump appears in `package.json`.

**Possible causes:**

- GitHub Actions doesn't have write permissions (see Initial Setup)
- `persist-credentials: true` not set in checkout step
- Protected branch rules blocking the bot from pushing

**Solution:**

1. Verify "Read and write permissions" is enabled (Settings → Actions → General)
2. Check protected branch rules don't block `github-actions[bot]`
3. Review workflow logs for git push errors

## Manual Release (Emergency)

If automation fails and you need to publish manually:

```bash
# 1. Update version and changelog
npx changeset version

# 2. Commit the version changes
git add -A
git commit -m "chore(release): version packages"
git push origin main

# 3. Create and push tag
export VERSION=$(node -p "require('./package.json').version")
git tag "v$VERSION"
git push origin "v$VERSION"

# 4. Build
npm run build

# 5. Login to npm (if not already)
npm login

# 6. Publish
npm publish --access public
```

**Note:** Manual releases should be rare. If you find yourself doing this often, investigate why automation is failing.

## Best Practices

### For Contributors

- **Always add a changeset** when your changes affect functionality or fix bugs
- **Write clear, user-facing summaries** in changesets (not internal implementation details)
- **Choose the correct bump type**:
  - When in doubt between minor and patch, use patch
  - Reserve major for truly breaking changes
  - Document breaking changes clearly in the changeset
- **Test your changes** before opening a PR - CI must pass for merge
- **Don't worry about version numbers** - the automation handles it

### For Maintainers

- **Review PRs carefully** - once merged, release is automatic
- **Check changeset summaries** for clarity before merging
- **Monitor npm after merges** to ensure publish succeeded
- **Time releases appropriately**:
  - Avoid merging major releases on Fridays or before holidays
  - Consider user impact when releasing breaking changes
- **Keep NPM_TOKEN secure**:
  - Rotate token periodically (every 6-12 months)
  - Use "Automation" token type (most restrictive that works)
  - Never expose the token in logs or commits
- **Watch for workflow failures**:
  - Subscribe to Actions notifications
  - Fix issues promptly to unblock releases

### Versioning Guidelines

Follow [Semantic Versioning](https://semver.org/):

- **0.x.y versions** (pre-1.0): Breaking changes can happen in minor versions
- **1.0.0+**: Strict semver - breaking changes require major bump

## How It Works

### Anti-Loop Mechanism

The workflow includes a critical guard to prevent infinite loops:

```bash
COMMIT_MSG=$(git log -1 --pretty=%s)
if [[ "$COMMIT_MSG" == *"chore(release): version packages"* ]]; then
  echo "Release commit detected. Skipping to prevent loop."
  exit 0
fi
```

This ensures:

1. Workflow runs when you merge your PR → creates release commit → pushes to main
2. Push to main triggers workflow again → detects release commit → exits immediately
3. No infinite loop ✓

### Changeset Detection

The workflow counts changeset files to determine if a release is needed:

```bash
CHANGESET_COUNT=$(find .changeset -name "*.md" ! -name "README.md" | wc -l)
if [ "$CHANGESET_COUNT" -eq 0 ]; then
  echo "No changesets found. Skipping release."
  exit 0
fi
```

This allows:

- Merging documentation updates without triggering releases
- Merging CI/workflow changes without releases
- Only releasing when actual changesets exist

## Version History

All releases are documented in `CHANGELOG.md`, which is automatically generated from changeset summaries.

## Comparison: Old vs New Flow

### Old Flow (2-PR approach with changesets/action)

1. Merge PR with changeset → triggers workflow
2. Workflow creates "Version Packages" PR
3. **Manual step**: Review and merge "Version Packages" PR
4. Workflow publishes to npm

### New Flow (direct approach)

1. Merge PR with changeset → triggers workflow
2. Workflow automatically: versions → commits → tags → publishes
3. **Done!** ✓

**Benefits of new flow:**

- Faster releases (2-3 minutes vs 5-10 minutes)
- No manual PR merge step
- Simpler mental model
- Fewer points of failure

## Further Reading

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Semantic Versioning](https://semver.org/)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [GitHub Actions Permissions](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token)
