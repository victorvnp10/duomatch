/**
 * Port for loading a couple's achievement-evaluation inputs and persisting
 * newly unlocked achievement ids. `packages/infrastructure-supabase`
 * implements this against Postgres; this package only depends on the shape.
 */
import type { BuildAchievementStatsInput } from "@duomatch/domain";

export interface AchievementInputs extends BuildAchievementStatsInput {
  currentAchievements: readonly string[];
}

export interface AchievementsRepository {
  loadAchievementInputs(coupleId: string): Promise<AchievementInputs>;
  persistUnlockedAchievements(coupleId: string, achievementIds: readonly string[]): Promise<void>;
}
