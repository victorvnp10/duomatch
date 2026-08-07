## 1. Types

- [ ] 1.1 Define `AchievementStats`, `Achievement`, `Round`, `RoundRule`, `RulesLastChecked`, `Activity`, `CoupleData`, `Reward`, `WishlistItem`, `CyclicalRulesResult`, `BuildAchievementStatsInput`, `EvaluateCyclicalRulesInput` in `packages/domain/src/types.ts`.

## 2. Achievement entity

- [ ] 2.1 Port `ACHIEVEMENT_CATALOG`, `getAchievementById`, `evaluateNewAchievements` to `packages/domain/src/entities/achievement.ts`, typed against `types.ts`.
- [ ] 2.2 Write `achievement.test.ts`: no thresholds met; single threshold met; multiple thresholds met at once; already-unlocked achievement excluded even though still met (ghost-achievement regression); `currentAchievements` defaults to `[]` when omitted; each of the three previously-unfixable achievements (`big_spender`, `hot_streak`, `wish_granter`) unlocks exactly at its boundary and not below it; `getAchievementById` hit and miss.

## 3. Achievement stats builder

- [ ] 3.1 Port `buildAchievementStats` to `packages/domain/src/services/achievement-stats-builder.ts`.
- [ ] 3.2 Write `achievement-stats-builder.test.ts`: all-empty input yields all-zero stats; activity confirmed by only one side counts toward challenges but not `completedActivities`; activity confirmed by both counts toward `completedActivities` and `completedHotActivities` when `category === "Hot"`; challenge-type activity confirmed by either side counts toward `totalChallengesCompleted` (combined with `dailyChallengeCompletions`) and `completedHotChallenges` when Hot; `rewards` summed by cost only when `status === "purchased"`; `wishlistItems` counted only for `"gifted"`/`"confirmed"` status; `streak`/`messageCount` pass through with 0 defaults.

## 4. Round rules evaluator

- [ ] 4.1 Port `findActiveRound`, the private `evaluateGoal` helper, `evaluateCyclicalRules`, and the activity/challenge counting helpers to `packages/domain/src/services/round-rules-evaluator.ts`, preserving the existing decomposition (stay under the ESLint complexity-10 limit).
- [ ] 4.2 Write `round-rules-evaluator.test.ts` for `findActiveRound`: date within a round's range; date outside every round; date exactly on a round's start/end boundary.
- [ ] 4.3 Write `round-rules-evaluator.test.ts` for `evaluateCyclicalRules`: no active round; no rules configured; rule not yet due; one partner meets goal and the other doesn't (both directions); both meet goal (no penalty, still marked checked); neither meets goal (no penalty, still marked checked); both rules due simultaneously with opposite outcomes (deltas additively merged, both `lastCheckedUpdates` keys set); activity created before the round's start excluded from the count even if its selection date falls inside the round window; challenge count excludes activities not created by the evaluated user.

## 5. Barrel export

- [ ] 5.1 Update `packages/domain/src/index.ts` to re-export the new modules and types; decide whether to retain or remove the `isPositiveInteger` placeholder now that real domain content exists.

## 6. Verification

- [ ] 6.1 Run `pnpm --filter @duomatch/domain build`, `typecheck`, `lint`, `test`, `dead-code` — all pass with zero errors/warnings.
- [ ] 6.2 Run the repo-root `pnpm dep-check` — no new violations (domain still imports nothing outside itself).
- [ ] 6.3 Confirm no files changed outside `packages/domain/src/` and this change's `openspec/` artifacts.
