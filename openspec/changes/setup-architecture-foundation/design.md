## Context

See proposal.md - Why. This is a greenfield repository: there is no existing monorepo tooling, lint config, or CI to migrate from. The design below is the first thing committed, so every choice here becomes the default every later change (starting with the `domain/achievements` and `domain/round-rules` Strangler Fig step) has to work inside.

## Goals / Non-Goals

**Goals:**
- Pick one concrete tool per governance requirement in specs/architecture-governance/spec.md and justify it.
- Make the dependency-direction rule fail closed (new packages are blocked by default until explicitly wired in), not fail open.
- Prove the CI pipeline is a real, non-bypassable gate from the very first commit, not just wiring that looks correct.

**Non-Goals:**
- Choosing the Supabase schema, RPC design, or Edge Function structure (out of scope until a change touches `infrastructure-supabase`).
- Choosing the client-state library (TanStack Query / Zustand) — that decision belongs to the `application/` migration change.
- Scaffolding `apps/admin` or any UI — no `presentation/` code exists yet.
- Full test pyramid (E2E, RPC concurrency tests, coverage thresholds) — those apply once there is domain/application code to cover; this change only proves the test runner and CI wiring work.

## Decisions

**Monorepo orchestrator: Turborepo (not Nx).**
Turborepo's config surface is small (a `turbo.json` pipeline graph) and imposes no opinion on package internals, which fits a project that only has four layer-packages and one CI pipeline today. Nx offers generators, a dependency graph UI, and stronger enforcement primitives, but that power comes with a steeper config model that isn't earning its cost yet. Revisit via ADR if remote build caching across a larger team, or Nx's built-in module-boundary rules, becomes worth the switch.

**Package manager: pnpm.**
pnpm's strict, non-hoisted `node_modules` layout prevents a package from silently resolving a dependency it never declared — a phantom-dependency bug that would otherwise let `domain/` accidentally get away with importing something not in its own `package.json`. This directly supports the "domain has zero external dependencies" requirement. Pinned via the `packageManager` field so `corepack` enforces the version for every contributor and in CI.

**Dependency-direction enforcement: dependency-cruiser (not an ESLint plugin).**
`dependency-cruiser` analyzes the whole module graph independently of ESLint's per-file AST pass, and its rules are expressed as an explicit allow-list of edges between packages. Default-deny: a new package that isn't named in the ruleset is blocked from importing anything, forcing a conscious edit to the ruleset (and, per the ADR requirement, a recorded decision) instead of silently inheriting whatever the default resolution allows. `eslint-plugin-boundaries` was considered — it would keep everything inside one `eslint` invocation — but its boundary model is layer-name-based pattern matching, which is weaker at catching indirect import chains than dependency-cruiser's graph traversal.

**Lint/format: ESLint + Prettier, sharing one config package.**
A single `packages/config/eslint-preset` and `packages/config/tsconfig.base.json` are consumed by every package, so a rule change (e.g. lowering the complexity threshold) is a one-line version bump everywhere instead of N config edits.

**Pre-commit vs CI: both, deliberately redundant.**
Husky + lint-staged run lint/format on staged files pre-commit for fast local feedback. This is bypassable with `--no-verify`, which is fine because it is not the enforcement mechanism — the CI pipeline re-runs the same checks on the full diff and is the only path that can unblock a merge (per the "Required, non-bypassable CI gate" requirement).

**Secret scanning: gitleaks.**
Chosen over TruffleHog for a lower false-positive rate on a TypeScript/JS codebase and a simpler single-binary GitHub Action with no external service account needed.

**Dependency audit: `pnpm audit` in CI, GitHub Dependabot alerts enabled.**
Both are zero-marginal-cost (no paid service, no new account) and cover the RNF-SEG-04 requirement (block merge on high/critical CVEs) from day one. Snyk was considered and rejected for now — it adds a paid account and a new integration surface for a benefit (deeper vuln database, auto-fix PRs) the project doesn't need yet; revisit via ADR if `pnpm audit`'s signal proves too noisy or shallow.

**Test runner: Vitest.**
Native ESM and TypeScript support without a transpile step, and shares Turborepo's caching model well. Wired into CI immediately with one seeded smoke test (see Risks) even though no domain logic exists yet, so "tests pass" is a real, non-trivial signal from the first PR onward, not a green check with nothing behind it.

**Commit linting: commitlint with the `@commitlint/config-conventional` preset**, installed as a Husky `commit-msg` hook and not re-checked in CI (a rejected local commit never reaches a PR, so there's nothing to re-verify).

**CI platform: GitHub Actions**, matching the proposal's `.github/workflows/ci.yml` and the assumption that GitHub hosts the repository.

## Risks / Trade-offs

- **[Risk]** An empty test suite trivially "passes," masking whether CI is really enforcing anything. → **Mitigation**: seed one real (not placeholder-only) smoke test against a trivial pure function in `packages/domain`, so the first CI run proves the runner executes and reports failures correctly, and RNF-TST-06 ("never reduce coverage") has a non-zero baseline to compare against later.
- **[Risk]** `dependency-cruiser`'s explicit ruleset can drift out of sync as new packages are added, either blocking legitimate work or (if someone loosens it carelessly) silently permitting a layer violation. → **Mitigation**: default-deny means drift fails closed (blocks unfamiliar packages) rather than open; any ruleset change is itself a reviewable diff and, per the governance spec, should be backed by an ADR if it changes what's allowed between layers.
- **[Risk]** pnpm is a less common package manager than npm/yarn and adds onboarding friction. → **Mitigation**: pin via `packageManager` + document the one-line `corepack enable` setup step in the root README (RNF-DOC-02).
- **[Risk]** Turborepo may prove insufficient if the project later needs Nx-style generators or a dependency graph UI. → **Mitigation**: the package/layer structure itself is orchestrator-agnostic; switching later is a tooling-config change, not a re-architecture, and would go through the same ADR process this change establishes.

## Migration Plan

No production system or existing users are affected — this is the first commit to an empty repository, so there is no data migration and no traffic cutover.

Deployment order (each step is independently mergeable behind the same PR checklist once the pipeline itself exists):
1. Root config: `package.json` with `packageManager` pinned, `turbo.json`, `packages/config/` (tsconfig base, ESLint preset, Prettier config).
2. Empty layer packages (`packages/domain`, `packages/application`, `packages/infrastructure-supabase`) each with their own `package.json`/`tsconfig.json` extending the base, plus one seeded smoke test in `domain`.
3. `dependency-cruiser` config expressing the allowed edges, run locally to confirm it passes against the (currently trivial) graph.
4. Husky + lint-staged + commitlint hooks.
5. `.github/workflows/ci.yml` wiring all checks together; confirm it's green on the PR that introduces it, then mark it as a required check in branch protection.
6. `docs/adr/` with the template and the ADRs for the decisions above.

**Rollback**: since nothing depends on this yet, rollback is reverting the PR(s). No feature flags or data cleanup needed.
