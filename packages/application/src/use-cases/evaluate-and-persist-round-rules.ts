import { evaluateCyclicalRules, findActiveRound } from "@duomatch/domain";
import type { CyclicalRulesResult } from "@duomatch/domain";

import type { RoundRulesRepository } from "../ports/round-rules-repository.js";

/**
 * Loads a couple's active round and activity data, evaluates the cyclical
 * round-rule domain logic, and persists the resulting score adjustment when
 * one is due. Returns `null` when there is no active round or nothing due.
 */
export async function evaluateAndPersistRoundRules(
  repository: RoundRulesRepository,
  coupleId: string,
  todayStr: string,
): Promise<CyclicalRulesResult | null> {
  const { userId, partnerId, rounds, allActivities } =
    await repository.loadRoundRuleInputs(coupleId);
  const activeRound = findActiveRound(rounds, todayStr);
  if (!activeRound) return null;

  const result = evaluateCyclicalRules({ activeRound, allActivities, userId, partnerId, todayStr });
  if (result) {
    await repository.persistRoundRuleAdjustment(activeRound.id, result);
  }

  return result;
}
