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
- [ ] 6.3 Add dependency vulnerability audit (`pnpm audit`, high/critical severity failing the build) as a required CI step; enable GitHub Dependabot alerts on the repository
      — CI step done (`.github/workflows/ci.yml`). Enabling Dependabot alerts was attempted via the GitHub REST API (`PUT /repos/victorvnp10/duomatch/vulnerability-alerts`) with a fine-grained PAT that has repo `admin: true` collaborator role but returned `403 Resource not accessible by personal access token` — the token was not granted the fine-grained "Administration" permission category, which this endpoint requires regardless of collaborator role. Pending: either enable manually (Settings → Code security and analysis) or re-run with a token that has Administration: Read and write.
- [x] 6.4 Add a scheduled (non-PR-blocking) dead-code detection job (`ts-prune` or equivalent)
- [ ] 6.5 Configure branch protection on the main branch: all CI checks above required, at least one human approval required for pull requests touching `packages/domain` or `packages/application`, no bypass path for administrators on those checks
      — Not done: `PUT /repos/victorvnp10/duomatch/branches/main/protection` returned the same 403 (missing Administration permission on the token). `.github/CODEOWNERS` was added (requiring review on `packages/domain/` and `packages/application/`) so the review requirement is ready to bite as soon as branch protection turns on "Require review from Code Owners". Exact command to run once a suitably-scoped token or `gh auth login` is available:
      `gh api -X PUT repos/victorvnp10/duomatch/branches/main/protection -f required_status_checks[strict]=true -f "required_status_checks[contexts][]=Lint, typecheck, architecture, tests" -f "required_status_checks[contexts][]=Secret scan (gitleaks)" -f "required_status_checks[contexts][]=Dependency vulnerability audit" -f enforce_admins=true -f required_pull_request_reviews[required_approving_review_count]=1 -f required_pull_request_reviews[require_code_owner_reviews]=true -f restrictions=null`

## 7. Verification and documentation

- [ ] 7.1 Open a throwaway PR exercising every failure mode from `specs/architecture-governance/spec.md` (domain importing outside itself, application importing infrastructure directly, type error, lint violation, unstructured `console.log`, non-conventional commit, committed secret, vulnerable dependency) and confirm each is blocked; then close it without merging
      — Substituted with local verification: domain→application, application→infrastructure-supabase, a type error, a `console.log`, and a non-conventional commit message were each individually introduced and confirmed to fail the corresponding local check, then reverted. A real-PR attempt via the GitHub REST API (`POST /repos/victorvnp10/duomatch/pulls`) failed with the same 403 (token has Pull requests: read but not write). Since branch protection (6.5) isn't live yet either, there is nothing on GitHub actually gating a PR right now regardless — this task is naturally blocked on 6.5 landing first, then needs a token with Pull requests: write (or `gh auth login`) to open/close the throwaway PR.
- [ ] 7.2 Open a clean PR with none of the above violations and confirm it passes every check and is mergeable
      — Substituted with a local full pipeline run (`build`, `lint`, `typecheck`, `dep-check`, `test`), all green, plus a real push to `main` (the CODEOWNERS commit) which triggered the `push`-triggered CI jobs successfully. A true PR-based check (`pull_request` trigger, not `push`) still needs Pull requests: write, same as 7.1.
- [x] 7.3 Create `docs/adr/` with the ADR template from design.md
- [x] 7.4 Record ADRs for: monorepo orchestrator choice (Turborepo), package manager choice (pnpm), dependency-direction tool choice (dependency-cruiser), dependency-audit approach (`pnpm audit` + Dependabot over Snyk)
