import { buildAchievementStats, evaluateNewAchievements } from "@duomatch/domain";

import type { AchievementsRepository } from "../ports/achievements-repository.js";

/**
 * Loads a couple's achievement inputs, evaluates the domain rule, and
 * persists only the achievement ids not already unlocked. Returns the
 * newly unlocked ids (possibly empty).
 */
export async function evaluateAndPersistAchievements(
  repository: AchievementsRepository,
  coupleId: string,
): Promise<string[]> {
  const { currentAchievements, ...statsInput } = await repository.loadAchievementInputs(coupleId);
  const stats = buildAchievementStats(statsInput);
  const newlyUnlocked = evaluateNewAchievements(stats, currentAchievements);

  if (newlyUnlocked.length > 0) {
    await repository.persistUnlockedAchievements(coupleId, newlyUnlocked);
  }

  return newlyUnlocked;
}
