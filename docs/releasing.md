# Releasing Schema Forge

This document explains how Schema Forge handles versioning and publishing to npm using automated workflows with Changesets.

## Overview

Schema Forge uses [Changesets](https://github.com/changesets/changesets) for managing releases. The process is fully automated through GitHub Actions, eliminating manual version bumps and npm publishing.

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

- The release workflow (`.github/workflows/release.yml`) is triggered
- It detects the changeset files in the repository

### Step 4: Automated Version PR Created

The release workflow automatically:

1. Creates (or updates) a PR titled **"chore: version packages"**
2. This PR contains:
   - Updated `version` field in `package.json`
   - Generated `CHANGELOG.md` with all changes
   - Removed changeset files (they're now incorporated)
3. The PR is ready for review

**Important:** This PR is created automatically. You don't need to do anything except review it.

### Step 5: Publish to npm

When a maintainer merges the "Version Packages" PR:

1. The release workflow runs again
2. It detects that the version has changed
3. Automatically runs:
   - `npm run build`: Builds the package
   - `npm run release` (which runs `changeset publish`): Publishes to npm
4. Creates a git tag for the new version
5. Package is live on npm! 🎉

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

All changesets in your PR will be combined when the version PR is created.

## Hotfix Process

For urgent fixes that need immediate release:

1. Create a branch from `main`
2. Make the fix
3. Run `npx changeset` and select **patch**
4. Open a PR marked as hotfix/urgent
5. Once merged to `main`, the automation kicks in
6. Merge the "Version Packages" PR immediately
7. The fix is published to npm within minutes

## Initial Setup for Maintainers

### Configuring NPM_TOKEN

The release workflow requires an npm authentication token to publish packages. This is a **one-time setup**:

#### Step 1: Generate npm Token

1. Log in to [npmjs.com](https://www.npmjs.com/)
2. Go to **Account Settings** → **Access Tokens**
3. Click **Generate New Token**
4. Select **Automation** type (recommended for CI/CD)
5. Copy the generated token (you won't see it again!)

#### Step 2: Add Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: Paste the token from npm
6. Click **Add secret**

That's it! The release workflow will now be able to publish to npm.

## Troubleshooting

### "Version Packages" PR Not Created

- Check if there are changesets in the `.changeset/` directory
- Ensure changesets have valid format (not just README.md and config.json)
- Check GitHub Actions logs for errors

### Publish Fails

- Verify `NPM_TOKEN` secret is configured correctly
- Ensure the npm token has publish permissions
- Check if the package name is available on npm
- Verify `access: public` in `.changeset/config.json`

### Version Already Published

- The workflow will not publish if the version in `package.json` already exists on npm
- This is expected behavior and not an error
- Create a new changeset and version bump to publish again

## Manual Release (Emergency)

If automation fails and you need to publish manually:

```bash
# Update version
npm run version-packages

# Build
npm run build

# Login to npm (if not already)
npm login

# Publish
npm publish --access public
```

**Note:** Manual releases should be rare. If you find yourself doing this often, investigate why automation is failing.

## Best Practices

### For Contributors

- Always add a changeset when your changes affect functionality
- Write clear, user-facing changeset summaries
- Choose the correct bump type (when in doubt, use patch)
- Don't worry about version numbers - the automation handles it

### For Maintainers

- Review the "Version Packages" PR carefully
- Ensure CHANGELOG.md entries are clear
- Time releases appropriately (avoid weekends/holidays for major versions)
- Monitor npm package page after merging version PR
- Keep NPM_TOKEN secret secure and rotate periodically

## Version History

All releases are documented in `CHANGELOG.md`, which is automatically generated from changeset summaries.

## Further Reading

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Semantic Versioning](https://semver.org/)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
