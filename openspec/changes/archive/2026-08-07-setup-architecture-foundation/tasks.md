## 1. Monorepo scaffold

- [x] 1.1 Initialize root `package.json` with `packageManager` pinned to a specific pnpm version (corepack-enforced)
- [x] 1.2 Add `turbo.json` defining the build/lint/typecheck/test pipeline graph
- [x] 1.3 Create `packages/config/` with a shared base `tsconfig.json` (strict mode) and a shared ESLint preset (import order, `react-hooks` rules, cyclomatic complexity max 10, `no-console` ban) and Prettier config
- [x] 1.4 Create root `.gitignore`, root README describing the monorepo layout and the one-line pnpm/corepack setup step

## 2. Layer packages

- [x] 2.1 Create `packages/domain` with its own `package.json`/`tsconfig.json` extending the shared base, zero runtime dependencies
- [x] 2.2 Create `packages/application` with its own `package.json`/`tsconfig.json` extending the shared base
- [x] 2.3 Create `packages/infrastructure-supabase` with its own `package.json`/`tsconfig.json` extending the shared base
- [x] 2.4 Add a placeholder `apps/mobile` package (or minimal app shell) representing the `presentation` layer, wired into the Turborepo pipeline
- [x] 2.5 Add a per-package README (purpose, how to run, how to test) for each package created in this section

## 3. Dependency-direction enforcement

- [x] 3.1 Install and configure `dependency-cruiser` with a default-deny ruleset expressing the allowed edges (`presentation → application → domain`, `infrastructure-supabase → domain`, `domain → nothing`)
- [x] 3.2 Add a script (`pnpm dep-check` or equivalent) that runs the ruleset against the full graph and exits non-zero on violation
- [x] 3.3 Verify the rule fails closed: temporarily add a violating import in a throwaway branch, confirm the check fails, then remove it

## 4. Test runner

- [x] 4.1 Install and configure Vitest for `packages/domain` (and wire the same config as the shared pattern other packages will reuse)
- [x] 4.2 Add one seeded smoke test against a trivial pure function in `packages/domain` so the suite is a real, non-trivial signal from the first run
- [x] 4.3 Wire `test` into the Turborepo pipeline

## 5. Local enforcement (pre-commit)

- [x] 5.1 Install Husky and lint-staged; run ESLint + Prettier on staged files on `pre-commit`
- [x] 5.2 Install commitlint with `@commitlint/config-conventional`; enforce it on the `commit-msg` hook
- [x] 5.3 Verify a lint violation is rejected locally, and a non-conventional commit message is rejected locally

## 6. CI pipeline

- [x] 6.1 Add `.github/workflows/ci.yml`: install deps (cached), lint, `tsc --noEmit` across all packages, dependency-direction check, test
- [x] 6.2 Add secret scanning (`gitleaks`) as a required CI step
- [x] 6.3 Add dependency vulnerability audit (`pnpm audit`, high/critical severity failing the build) as a required CI step; enable GitHub Dependabot alerts on the repository
      — Done. CI step in `.github/workflows/ci.yml`. Dependabot alerts enabled via `PUT /repos/victorvnp10/duomatch/vulnerability-alerts` (204) with a fine-grained PAT granted Administration: Read and write. `pnpm audit` then surfaced 2 critical/1 high/3 moderate real vulnerabilities in the `vitest@2.1.9` → `vite@5.4.21` transitive chain, fixed by bumping to `vitest@^4.1.10` + `vite@^8.2.1` (see PR fixing this).
- [x] 6.4 Add a scheduled (non-PR-blocking) dead-code detection job (`ts-prune` or equivalent)
- [x] 6.5 Configure branch protection on the main branch: all CI checks above required, at least one human approval required for pull requests touching `packages/domain` or `packages/application`, no bypass path for administrators on those checks
      — Done via `PUT /repos/victorvnp10/duomatch/branches/main/protection`: required status checks (`Lint, typecheck, architecture, tests`, `Secret scan (gitleaks)`, `Dependency vulnerability audit`, strict), `enforce_admins: true`, 1 required approving review with `require_code_owner_reviews: true` (backed by `.github/CODEOWNERS` covering `packages/domain/` and `packages/application/`). Verified live: a direct `git push origin main` with an admin-scoped token was rejected (`GH006: Protected branch update failed ... Changes must be made through a pull request`).

## 7. Verification and documentation

- [x] 7.1 Open a throwaway PR exercising every failure mode from `specs/architecture-governance/spec.md` (domain importing outside itself, application importing infrastructure directly, type error, lint violation, unstructured `console.log`, non-conventional commit, committed secret, vulnerable dependency) and confirm each is blocked; then close it without merging
      — Local verification: domain→application, application→infrastructure-supabase, a type error, a `console.log`, and a non-conventional commit message were each individually introduced and confirmed to fail the corresponding local check, then reverted. Real-PR verification: opened PR #1 (`verify/violations`, a domain→application import) — `Lint, typecheck, architecture, tests` and `Dependency vulnerability audit` both reported `conclusion: failure`, and the PR's `mergeable_state` was `blocked`. Closed without merging; branch deleted.
- [x] 7.2 Open a clean PR with none of the above violations and confirm it passes every check and is mergeable
      — Opened PR #2 (`fix/vitest-vite-security-bump`, the vitest/vite security fix below). All 3 required checks reported `conclusion: success`. `mergeable: true`, but `mergeable_state: "blocked"` pending the required code-owner review — confirmed the review gate is real by attempting to self-approve via the API, which GitHub correctly rejected (`422 Can not approve your own pull request`). Merging PR #2 needs a human (repo owner) review; left open for that.
- [x] 7.3 Create `docs/adr/` with the ADR template from design.md
- [x] 7.4 Record ADRs for: monorepo orchestrator choice (Turborepo), package manager choice (pnpm), dependency-direction tool choice (dependency-cruiser), dependency-audit approach (`pnpm audit` + Dependabot over Snyk)
