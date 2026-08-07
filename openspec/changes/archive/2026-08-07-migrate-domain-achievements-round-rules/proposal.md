## Why

`setup-architecture-foundation` established the layered monorepo skeleton and named `domain/achievements` and `domain/round-rules` as the first Strangler Fig migration step. The legacy DuoMatch codebase (a sibling pre-audit React/Firebase app) already has this business logic isolated as pure, framework-free functions — but with zero automated test coverage, and it previously shipped real "ghost achievement" bugs (achievements a couple could see but never actually unlock) caused by duplicated, divergent copies of the same logic across a hook and two UI components. Porting the pure logic into `packages/domain` now, as tested strict-mode TypeScript, gives the later application-layer change (Supabase-backed hooks) a single, typed, regression-tested source of truth to build on instead of repeating the same untested-duplication mistake.

## What Changes

- Add `packages/domain/src/types.ts` with the shared TypeScript types the achievement and round-rules logic operates on (`AchievementStats`, `Achievement`, `Round`, `RoundRule`, `Activity`, `CoupleData`, `Reward`, `WishlistItem`, `CyclicalRulesResult`, and the input types for the builder/evaluator functions).
- Add `packages/domain/src/entities/achievement.ts`: a 1:1 port of the legacy `ACHIEVEMENT_CATALOG`, `getAchievementById`, and `evaluateNewAchievements` — no behavior changes, only typing.
- Add `packages/domain/src/services/achievement-stats-builder.ts`: a 1:1 port of `buildAchievementStats`.
- Add `packages/domain/src/services/round-rules-evaluator.ts`: a 1:1 port of `findActiveRound` and `evaluateCyclicalRules` (including its private `evaluateGoal` decomposition, preserved as-is to stay under the existing cyclomatic-complexity lint limit).
- Add a co-located Vitest test file for each new module, giving this logic its first real automated test coverage — including regression tests for the specific "ghost achievement" bug class the legacy code's own comments describe.
- Update `packages/domain/src/index.ts` to re-export the new modules.
- **BREAKING**: none — additive only, and `packages/domain` has no external consumers yet.

## Capabilities

### New Capabilities

- `domain-achievements-round-rules`: pure business-logic rules for evaluating which achievements a couple has newly unlocked, and for evaluating cyclical round scoring penalties — both as side-effect-free functions with no dependency on any datastore or UI framework.

### Modified Capabilities

(none)

## Impact

- **Affected code**: `packages/domain/src/**` only. No changes to `packages/application`, `packages/infrastructure-supabase`, `apps/mobile`, CI/tooling config, or any Firebase/Supabase code — those remain out of scope until their own dedicated changes (application-layer hooks, infrastructure adapters, presentation migration).
- **Dependencies added**: none (`packages/domain` keeps zero runtime dependencies).
- **ADR**: none needed — no new tool, library, or cross-cutting architectural decision is introduced; this is a logic port into an already-established package under already-established conventions (strict TS, Vitest, dependency-cruiser boundary).
- **Follow-on changes unblocked**: the application-layer change (TanStack Query hooks over Supabase) that orchestrates calls to `evaluateNewAchievements`, `buildAchievementStats`, and `evaluateCyclicalRules` against real data.
