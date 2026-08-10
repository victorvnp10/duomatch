import type { Activity, BuildAchievementStatsInput, Reward, WishlistItem } from "@duomatch/domain";
import type { SupabaseClient } from "@supabase/supabase-js";

import { mapActivityRow, type ActivityRow } from "./mappers/activity-row.js";
import { resolveCoupleMembers } from "./resolve-couple-members.js";

// Structurally matches @duomatch/application's AchievementInputs without
// importing it (infrastructure-supabase must not depend on
// packages/application — see architecture-governance).
export interface SupabaseAchievementInputs extends BuildAchievementStatsInput {
  currentAchievements: readonly string[];
}

const ACTIVITY_SELECT =
  "type, category, created_by, created_at, activity_selections(user_id, status, selection_date)";

interface CoupleRow {
  daily_challenge_completions: number;
  streak: number;
  message_count: number;
}

interface RewardRow {
  status: string;
  cost: number | null;
}

interface AchievementRows {
  couple: CoupleRow | null;
  activities: ActivityRow[];
  rewards: RewardRow[];
  wishlistItems: Array<{ status: string }>;
  achievements: Array<{ achievement_id: string }>;
}

const mapReward = (row: RewardRow): Reward => ({
  status: row.status,
  ...(row.cost != null ? { cost: row.cost } : {}),
});

/**
 * Structurally satisfies @duomatch/application's AchievementsRepository
 * port. The application layer wires this in; this class itself never
 * imports from packages/application.
 */
export class SupabaseAchievementsRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async fetchAchievementRows(coupleId: string): Promise<AchievementRows> {
    const [coupleResult, activitiesResult, rewardsResult, wishlistResult, achievementsResult] =
      await Promise.all([
        this.client
          .from("couples")
          .select("daily_challenge_completions, streak, message_count")
          .eq("id", coupleId)
          .single(),
        this.client.from("activities").select(ACTIVITY_SELECT).eq("couple_id", coupleId),
        this.client.from("rewards").select("status, cost").eq("couple_id", coupleId),
        this.client.from("wishlist_items").select("status").eq("couple_id", coupleId),
        this.client.from("couple_achievements").select("achievement_id").eq("couple_id", coupleId),
      ]);

    for (const result of [
      coupleResult,
      activitiesResult,
      rewardsResult,
      wishlistResult,
      achievementsResult,
    ]) {
      if (result.error) throw result.error;
    }

    return {
      couple: coupleResult.data,
      activities: (activitiesResult.data ?? []) as ActivityRow[],
      rewards: rewardsResult.data ?? [],
      wishlistItems: wishlistResult.data ?? [],
      achievements: achievementsResult.data ?? [],
    };
  }

  async loadAchievementInputs(coupleId: string): Promise<SupabaseAchievementInputs> {
    const { userId, partnerId } = await resolveCoupleMembers(this.client, coupleId);
    const rows = await this.fetchAchievementRows(coupleId);
    const wishlistItems: WishlistItem[] = rows.wishlistItems.map((row) => ({ status: row.status }));
    const allActivities: Activity[] = rows.activities.map(mapActivityRow);

    return {
      userId,
      partnerId,
      allActivities,
      coupleData: {
        dailyChallengeCompletions: rows.couple?.daily_challenge_completions ?? 0,
        streak: rows.couple?.streak ?? 0,
        messageCount: rows.couple?.message_count ?? 0,
      },
      rewards: rows.rewards.map(mapReward),
      wishlistItems,
      currentAchievements: rows.achievements.map((row) => row.achievement_id),
    };
  }

  async persistUnlockedAchievements(
    coupleId: string,
    achievementIds: readonly string[],
  ): Promise<void> {
    if (achievementIds.length === 0) return;

    const { error } = await this.client.from("couple_achievements").upsert(
      achievementIds.map((achievementId) => ({
        couple_id: coupleId,
        achievement_id: achievementId,
      })),
      { onConflict: "couple_id,achievement_id", ignoreDuplicates: true },
    );
    if (error) throw error;
  }
}
