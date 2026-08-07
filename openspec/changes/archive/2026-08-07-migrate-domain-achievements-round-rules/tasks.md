## 1. Types

- [x] 1.1 Define `AchievementStats`, `Achievement`, `Round`, `RoundRule`, `RulesLastChecked`, `Activity`, `CoupleData`, `Reward`, `WishlistItem`, `CyclicalRulesResult`, `BuildAchievementStatsInput`, `EvaluateCyclicalRulesInput` in `packages/domain/src/types.ts`.

## 2. Achievement entity

- [x] 2.1 Port `ACHIEVEMENT_CATALOG`, `getAchievementById`, `evaluateNewAchievements` to `packages/domain/src/entities/achievement.ts`, typed against `types.ts`.
- [x] 2.2 Write `achievement.test.ts`: no thresholds met; single threshold met; multiple thresholds met at once; already-unlocked achievement excluded even though still met (ghost-achievement regression); `currentAchievements` defaults to `[]` when omitted; each of the three previously-unfixable achievements (`big_spender`, `hot_streak`, `wish_granter`) unlocks exactly at its boundary and not below it; `getAchievementById` hit and miss.

## 3. Achievement stats builder

- [x] 3.1 Port `buildAchievementStats` to `packages/domain/src/services/achievement-stats-builder.ts`.
- [x] 3.2 Write `achievement-stats-builder.test.ts`: all-empty input yields all-zero stats; activity confirmed by only one side counts toward challenges but not `completedActivities`; activity confirmed by both counts toward `completedActivities` and `completedHotActivities` when `category === "Hot"`; challenge-type activity confirmed by either side counts toward `totalChallengesCompleted` (combined with `dailyChallengeCompletions`) and `completedHotChallenges` when Hot; `rewards` summed by cost only when `status === "purchased"`; `wishlistItems` counted only for `"gifted"`/`"confirmed"` status; `streak`/`messageCount` pass through with 0 defaults.

## 4. Round rules evaluator

- [x] 4.1 Port `findActiveRound`, the private `evaluateGoal` helper, `evaluateCyclicalRules`, and the activity/challenge counting helpers to `packages/domain/src/services/round-rules-evaluator.ts`, preserving the existing decomposition (stay under the ESLint complexity-10 limit). Further split `evaluateCyclicalRules` itself (`resolveLastCheckedDate`, `applyGoalResult` helpers) and the activity-count filter (`wasCreatedInCurrentRound`, `hasConfirmedSelectionInRound`) beyond the legacy decomposition — the legacy code wasn't linted with a complexity budget that counts `?.`/`??` as branches, so a straight 1:1 port still exceeded the limit.
- [x] 4.2 Write `round-rules-evaluator.test.ts` for `findActiveRound`: date within a round's range; date outside every round; date exactly on a round's start/end boundary.
- [x] 4.3 Write `round-rules-evaluator.test.ts` for `evaluateCyclicalRules`: no active round; no rules configured; rule not yet due; one partner meets goal and the other doesn't (both directions); both meet goal (no penalty, still marked checked); neither meets goal (no penalty, still marked checked); both rules due simultaneously with opposite outcomes (deltas additively merged, both `lastCheckedUpdates` keys set); activity created before the round's start excluded from the count even if its selection date falls inside the round window; challenge count excludes activities not created by the evaluated user.

## 5. Barrel export

- [x] 5.1 Update `packages/domain/src/index.ts` to re-export the new modules and types. Retained the `isPositiveInteger` placeholder rather than removing it: `packages/application/src/index.ts`'s own placeholder (`assertPositiveIntegerInput`) imports it to demonstrate the application→domain dependency-cruiser boundary — a real, if trivial, consumer the proposal's "no external consumers" claim missed. First CI run on the PR caught this (`tsc` failure in `packages/application`); fixed by restoring the export instead of touching `application/`, keeping the change's stated scope intact.

## 6. Verification

- [x] 6.1 Run `pnpm --filter @duomatch/domain build`, `typecheck`, `lint`, `test`, `dead-code` — build/typecheck/lint/test all pass with zero errors/warnings (35 tests). `dead-code` (ts-prune) flags every new export as unused, expected and correct: nothing outside `packages/domain` consumes them yet, per this change's explicit non-goal; it is a non-blocking scheduled CI job, not a required PR check.
- [x] 6.2 Run the repo-root `pnpm dep-check` — no violations (13 modules, 13 dependencies cruised).
- [x] 6.3 Confirmed via `git status` before commit: diff scoped to `packages/domain/src/**` and this change's `openspec/` artifacts only. Verified for real via PR #4 on GitHub: all 3 required checks (lint/typecheck/dep-check/test, gitleaks, `pnpm audit`) green, merged.
