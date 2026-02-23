# Contributing to Schema Forge

Thank you for your interest in contributing to Schema Forge! This document explains how to contribute changes and manage versioning.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Make your changes
4. Run tests: `npm test`
5. Build: `npm run build`

## Adding a Changeset

Schema Forge uses [Changesets](https://github.com/changesets/changesets) to manage versions and changelogs. When you make changes that should be released, you need to add a changeset.

### How to Add a Changeset

Run the following command in your branch:

```bash
npx changeset
```

This will prompt you to:

1. Select the type of change (patch/minor/major)
2. Write a summary of your changes

### Choosing the Right Bump Type

Follow [Semantic Versioning](https://semver.org/):

- **patch** (0.1.0 → 0.1.1): Bug fixes, small improvements, no breaking changes
- **minor** (0.1.0 → 0.2.0): New features, backwards-compatible changes
- **major** (0.1.0 → 1.0.0): Breaking changes, incompatible API changes

### What Happens Next

1. The changeset file (`.changeset/<hash>.md`) will be created in your branch
2. Commit this file along with your code changes
3. Open a pull request with your changes
4. Once your PR is merged to `main`, an automated PR called "Version Packages" will be created
5. When that PR is merged, your changes will be automatically published to npm

## Pull Request Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Add a changeset: `npx changeset`
4. Commit your changes including the changeset file
5. Push your branch and open a PR
6. Wait for CI to pass (tests, build)
7. After review and merge, the automation takes over

## Automated Release Process

Once your PR is merged to `main`:

1. A GitHub Action runs and detects the changeset
2. It creates (or updates) a PR titled "Version Packages"
3. This PR contains:
   - Updated version in `package.json`
   - Updated `CHANGELOG.md`
   - All pending changesets removed
4. When a maintainer merges the "Version Packages" PR:
   - The package is automatically published to npm
   - A git tag is created for the version

**Note:** You don't need to do anything after your PR is merged. The versioning and publishing is fully automated.

## Hotfixes

For urgent bug fixes:

1. Create a branch from `main`
2. Make the fix
3. Run `npx changeset` and select **patch**
4. Open a PR and ensure it's marked as urgent
5. Once merged, the automated release will publish it quickly

## Questions?

For more details on the release process, see [docs/releasing.md](docs/releasing.md).

If you have questions, feel free to open an issue or discussion on GitHub.
