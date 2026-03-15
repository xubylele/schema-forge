# 🧱 Schema Forge — Full Product Roadmap

This roadmap describes the evolution of Schema Forge from a local CLI tool into a full ecosystem including Cloud services and freemium capabilities.

The core philosophy remains:

**Schema files are the single source of truth.**

Everything else builds on top of this principle.

---

# 🎯 Product Vision

Schema Forge aims to become a **deterministic, declarative database schema platform**.

Developers should be able to:

* define schemas in a DSL
* generate deterministic migrations
* validate database changes safely
* visualize and collaborate on schema evolution

The system is composed of:

* CLI
* Core engine
* VSCode extension
* Website & Playground
* Cloud services
* GitHub Action

---

# 🗓 Phase 1 — Core CLI (Completed)

Goal: build a deterministic schema workflow.

### Features

* DSL parser
* schema validation
* deterministic diff engine
* SQL migration generator

### Commands

```
schemaforge init
schemaforge diff
schemaforge generate
schemaforge validate
schemaforge import
schemaforge introspect
schemaforge doctor
```

* **init**: Optional provider `postgres` (default) or `supabase`; Supabase uses `supabase/migrations` for output.
* **introspect**: Extract normalized schema from PostgreSQL (`--url`, `--schema`, `--json`, `--out`).
* **doctor**: Check live database drift against state; exits with code 2 when drift detected; supports `--json`.

### Status

✅ Completed

---

# 🗓 Phase 2 — Safety & Reliability (Completed)

Goal: make migrations safe for real production usage.

### Features

* destructive change detection
* safe mode (`--safe`)
* force mode (`--force`) to bypass safety and CI checks (supported on `diff`, `generate`, and `validate`)
* interactive confirmations for risky operations
* JSON output for CI (`validate --json`, `doctor --json`)
* CI-aware exit codes: exit 3 when destructive operations detected in CI unless `--force`

### Example

```
schemaforge diff --safe
schemaforge validate --json
schemaforge validate --force
```

### Status

✅ Completed

---

# 🗓 Phase 3 — Developer Experience (Completed)

Goal: improve usability through editor integrations.

### VSCode Extension

Features (implemented):

* syntax highlighting (grammar for `.sf`)
* diagnostics
* semantic validation rules
* completion provider
* hover documentation
* code actions
* **Preview SQL** (inline SQL preview)
* **Diff preview**
* **Schema status bar**
* **Visual diff** — structured view of schema changes (operations + safety findings) in a webview; Open SQL Preview / Copy SQL from the panel
* **Richer schema status indicator** — click status bar to open Quick Pick (Run Diff Preview, Open Visual Diff, Generate); tooltips explain click; "checking..." state while diff runs after save
* Commands: init, generate, diff, diffPreview, previewSql, visualDiff, statusBarClick

### Status

✅ Completed

---

# 🗓 Phase 4 — Website & Playground (In progress)

Goal: make Schema Forge easy to understand and try.

### Website

* landing page
* quickstart
* documentation (DSL, CLI, migration workflow)
* product overview
* **roadmap** page
* **Login / Signup** (email–password; site posts to Cloud API, then sets Supabase session)
* **Auth callback** (OAuth and session handling)
* **CLI login page** (device flow: user code, approve, token for `schemaforge login`)

### Playground

Interactive DSL editor that runs **schema-forge-core in the browser** (browser build).

Features:

* live SQL generation
* schema validation
* baseline + diff preview (migration SQL from a set baseline)

### Status

🟡 In progress

---

# 🗓 Phase 5 — Schema Forge Cloud (In progress)

Goal: enable collaboration and advanced capabilities.

Cloud architecture:

**CLI → Cloud API**

Stack:

* Express
* Supabase (Auth; optional PostgreSQL for app data)
* JWT verification via Supabase JWKS

### Cloud Features (current)

* **Authentication**
  * Email/password signup and login (proxied to Supabase)
  * GitHub OAuth (prepared; redirect and callback implemented)
  * **CLI device login**: `POST /api/auth/cli/device`, `POST /api/auth/cli/token`, `POST /api/auth/cli/approve`; device sessions in-memory (single-instance)
* **Protected routes**: `/api/auth/me`, `/api/protected/*` with Supabase JWT
* **Health**: `/api/health`

Not yet implemented:

* Stripe / license system
* schema state storage
* Multi-instance device store (e.g. Redis/DB)

### CLI login flow

```
schemaforge login
schemaforge logout
```

Token stored in user config dir; browser opens site CLI-login page; user approves; CLI polls for token.

### Status

🟡 In progress

---

# 🗓 Phase 6 — Freemium Model (Planned)

Goal: keep the core open while enabling premium services.

### Free Tier

Available to all users.

Features:

* CLI
* schema DSL
* migration generation
* PostgreSQL support
* Supabase compatibility
* VSCode extension
* playground
* validation

These remain permanently free.

### Pro Tier

Available via Cloud subscription.

Premium features:

* migration risk analysis
* schema graph generation
* cloud schema state sync
* CI insights

### Status

⬜ Planned (no Stripe or license checks in codebase yet)

---

# 🗓 Phase 7 — Advanced Platform Features (Planned)

Goal: expand the platform beyond local tooling.

### Schema Graph

Generate relational graph representation.

```
schemaforge graph
```

Used for:

* visualization
* documentation
* impact analysis

### Migration Risk Analysis

Analyze migrations before execution (CLI already surfaces destructive/warning findings; dedicated “risk analysis” product feature is planned).

Example warnings:

* table rewrite risk
* destructive operations

### Cloud Schema State

Synchronize schema state across machines.

Commands:

```
schemaforge cloud push
schemaforge cloud pull
```

### Status

⬜ Planned

---

# 🗓 Phase 8 — CI & Automation (In progress)

Goal: integrate Schema Forge with development pipelines.

### GitHub Action (schema-forge-action)

* Run Schema Forge in CI: **validate**, **doctor**, **diff** (configurable command + args).
* Optional **comment-preview**: when `command` is `diff` and `comment-preview` is true, post or update a PR comment with migration SQL (pull_request only).
* Inputs: `command`, `args`, `schema-forge-version`, `working-directory`, `comment-preview`, `token`.

Example:

```yaml
- uses: xubylele/schema-forge-action@v1
  with:
    command: validate
    args: --json
```

```yaml
- uses: xubylele/schema-forge-action@v1
  with:
    command: diff
    comment-preview: true
```

### Status

🟡 In progress (Action shipped; schema validation in PRs and migration previews available)

---

# 🗓 Phase 9 — Multi‑Provider Support (Planned)

Goal: extend Schema Forge beyond PostgreSQL.

Provider architecture:

```
DatabaseProvider
```

Current: **postgres**, **supabase** (init/generate output).

Planned providers:

* MySQL
* SQLite

PostgreSQL remains the primary provider.

### Status

⬜ Planned

---

# 🗓 Phase 10 — Visual Schema Platform (Planned)

Goal: transform Schema Forge into a full schema platform.

Future features:

* visual schema explorer
* migration timeline
* schema history
* collaborative review

### Status

⬜ Planned

---

# 🎯 Long‑Term Vision

Schema Forge becomes a **complete schema management platform**.

Capabilities include:

* deterministic migrations
* schema visualization
* automated analysis
* collaborative workflows

While maintaining the core principle:

**the schema file is always the source of truth.**

---

# 📦 Repositories (current)

| Repo | Purpose |
|------|--------|
| **schema-forge** | CLI (init, diff, generate, validate, import, introspect, doctor, login, logout) |
| **schema-forge-core** | Parser, diff, safety, drift, SQL generator, browser build for playground |
| **schema-forge-vscode** | VSCode extension (syntax, diagnostics, completion, preview, status bar) |
| **schema-forge-site** | Next.js site (landing, docs, playground, login, signup, cli-login) |
| **schema-forge-cloud** | Express API (Supabase Auth, device login, protected routes) |
| **schema-forge-action** | GitHub Action (validate, doctor, diff; optional PR comment preview) |
