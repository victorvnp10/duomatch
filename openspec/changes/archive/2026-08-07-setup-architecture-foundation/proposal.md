## Why

DuoMatch is being rewritten from scratch after an audit of the current codebase found business logic embedded in UI components, a duplicated achievements catalog with divergent results, leaked Firebase listeners, hard-coded API keys, and zero automated tests. These are not isolated bugs — they are symptoms of an architecture with no enforced boundary between domain logic, orchestration, and infrastructure, and no tooling to catch violations before they ship.

Per the recommended Strangler Fig migration path, the first change must establish the structural skeleton and the automated guardrails (layering, typing, linting, CI) that every subsequent capability migration (starting with the `domain/achievements` and `domain/round-rules` modules) will be built inside and measured against. No business logic is migrated in this change — it creates the empty, enforced structure that makes correct placement of that logic the path of least resistance.

## What Changes

- Establish a monorepo (Turborepo) with packages organized by architectural layer, not by technology: `domain/`, `application/`, `infrastructure-supabase/`, and app shells under `apps/` for `presentation`.
- Add TypeScript in `strict` mode across all packages, with a shared base `tsconfig` in `packages/config/`.
- Add a dependency-direction linter (`dependency-cruiser`) that fails the build if `domain/` imports anything outside itself, or if `application/` imports `infrastructure-supabase/` or `presentation/` directly instead of through a port interface.
- Add ESLint (import order, react-hooks rules, cyclomatic complexity max 10, `no-console` except through a structured logger) and Prettier, wired through a shared `packages/config/` preset.
- Add Husky + lint-staged so lint/format run on every commit, mirrored by the same checks in CI (pre-commit is a convenience, CI is the enforced gate).
- Add Commitlint enforcing Conventional Commits.
- Add a minimal CI pipeline (GitHub Actions) that on every PR: installs deps, runs lint, runs `tsc --noEmit`, runs the architecture-layer check, runs a secret scanner (`gitleaks`), runs a dependency vulnerability audit, and runs the (currently empty) unit test suite — all required to pass before merge, with no manual bypass for `domain/` or `application/` changes.
- Add a dead-code detector (`ts-prune` or equivalent) as a scheduled/CI check.
- Create `docs/adr/` with the ADR template from the architecture requirements document, and record this change's own decisions (monorepo tool choice, lint tool choice) as the first ADRs.
- **BREAKING**: none — this change creates a new, empty codebase structure; it does not modify or migrate the existing DuoMatch application.

## Capabilities

### New Capabilities

- `architecture-governance`: structural and tooling rules that every later capability must satisfy — layered package structure, enforced dependency direction, strict typing, lint/format/commit gates, and the CI pipeline that verifies all of it on every PR.

### Modified Capabilities

(none — greenfield structure, no existing specs to modify)

## Impact

- **Affected code**: none yet (no application code exists in this repo). This change creates `apps/`, `packages/domain`, `packages/application`, `packages/infrastructure-supabase`, `packages/config`, `docs/adr/`, `turbo.json`, root `tsconfig.json`/`.eslintrc`/`.prettierrc`, `.husky/`, and `.github/workflows/ci.yml`.
- **Dependencies added**: TypeScript, ESLint (+ plugins), Prettier, dependency-cruiser, Husky, lint-staged, commitlint, Turborepo, gitleaks (CI-only), ts-prune.
- **Systems**: GitHub Actions CI. No database, backend, or deployment impact — Supabase schema/migrations and Edge Functions are out of scope for this change.
- **Follow-on changes unblocked**: `domain/achievements` and `domain/round-rules` migration (next Strangler Fig step), `application/` layer with TanStack Query, `infrastructure-supabase` adapters, and per-screen `presentation/` migration.
