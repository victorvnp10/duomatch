## Context

See proposal.md - Why. The source logic already exists as pure JavaScript in a sibling legacy repo (`duomatch_new`), with no unit tests. This is a 1:1 logic port into `packages/domain`, constrained by conventions the `setup-architecture-foundation` change already fixed: strict TypeScript (`tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), ESLint cyclomatic-complexity limit of 10, Vitest, zero runtime dependencies in `domain`, and dependency-cruiser boundary enforcement.

## Goals / Non-Goals

**Goals:**

- Port `Achievement.js`, `AchievementStatsBuilder.js`, and `RoundRulesEvaluator.js` into typed, tested `packages/domain` modules with no behavior change.
- Give this logic its first real automated test coverage, including regression coverage for the specific bug classes the legacy code's own comments describe (achievements that could never actually unlock; stale-activity counting across round boundaries).

**Non-Goals:**

- Any application-layer orchestration (hooks, Supabase reads/writes) — that is a separate future change.
- Any change to the achievement catalog's contents or unlock thresholds — this is a port, not a redesign.
- A repository/port interface for these functions' inputs — the functions stay pure and take plain data in; wiring real data sources through `application/` is out of scope here.

## Decisions

**File layout mirrors the legacy `entities/` + `services/` split, not a flat structure.**
`packages/domain/src/entities/achievement.ts` and `packages/domain/src/services/{achievement-stats-builder,round-rules-evaluator}.ts`. This keeps a 1:1 mental map to the legacy source for review (a straight port, not a redesign) and matches the vocabulary the prior change's proposal already used ("`domain/achievements`", "`domain/round-rules`" modules). `packages/domain/src/index.ts` stays a thin re-export barrel, as its existing comment already states new domain files would be.

**Shared types live in one `types.ts`, not co-located per file.**
`AchievementStats` is produced by `achievement-stats-builder.ts` and consumed by `achievement.ts` — a single shared types file avoids a circular or awkward cross-import between the two for a handful of small interfaces.

**One capability (`domain-achievements-round-rules`), not two.**
Both are delivered in the same change, land in the same package, and share the same "pure function, zero side effects" nature. The existing `architecture-governance` capability already establishes the project's precedent of one capability bundling several related requirement blocks rather than one capability per requirement. Splitting would produce two near-empty spec files merged in the same PR with no independent-shipping benefit; future changes can still scope a `MODIFIED` delta against just one of the two requirement blocks.

**`exactOptionalPropertyTypes` and the legacy code's default-parameter style.**
The legacy functions already default missing collections/fields via JS destructuring defaults (`allActivities = []`, `coupleData = {}`) and optional chaining (`activity.selections?.[userId]`) rather than ever assigning `undefined` explicitly — this is directly compatible with `exactOptionalPropertyTypes: true` and requires no behavioral adaptation, only adding the type annotations.

**Preserve the `evaluateGoal` private-helper decomposition in `round-rules-evaluator.ts` as-is.**
The legacy code already factors `evaluateCyclicalRules` into a smaller `evaluateGoal` helper specifically to stay under a complexity budget; flattening it back down during the port would fail the project's ESLint `complexity: 10` rule.

**No ADR.** No new tool, library, or cross-cutting architectural decision — this change operates entirely inside conventions the first change already recorded ADRs for.

## Risks / Trade-offs

- **[Risk]** The legacy code has zero tests, so "no behavior change" during the port can't be verified by a passing legacy test suite. → **Mitigation**: write the new tests first against the ported TypeScript, deriving expected behavior directly from the legacy source's own logic and comments (including its documented bug-fix history), rather than porting logic and tests as an untested pair.
- **[Risk]** `first_activity` and `first_match` in the achievement catalog share the identical unlock predicate (`completedActivities >= 1`) — could look like a copy-paste bug during review. → **Mitigation**: preserve as-is (it's the legacy catalog's actual defined behavior, not something this port should silently "fix"), and add an explicit test documenting both unlock together intentionally.

## Migration Plan

Additive only — new files under `packages/domain/src/`, no existing behavior removed or changed, no consumers yet. Rollback is reverting the PR.
