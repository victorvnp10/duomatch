// Barrel export for packages/application. Every module is added as a
// sibling file/folder and re-exported here — never imported from outside
// packages/application via a deep path.
export type { AchievementInputs, AchievementsRepository } from "./ports/achievements-repository.js";
export type { RoundRuleInputs, RoundRulesRepository } from "./ports/round-rules-repository.js";
export { evaluateAndPersistAchievements } from "./use-cases/evaluate-and-persist-achievements.js";
export { evaluateAndPersistRoundRules } from "./use-cases/evaluate-and-persist-round-rules.js";

// Kept even though the ports/use-cases above are now real consumers of
// @duomatch/domain: apps/mobile/src/index.ts imports this placeholder to
// demonstrate the apps -> application dependency-cruiser boundary, and
// touching apps/mobile is out of scope for this change (see proposal.md).
import { isPositiveInteger } from "@duomatch/domain";

export function assertPositiveIntegerInput(value: number): boolean {
  return isPositiveInteger(value);
}
