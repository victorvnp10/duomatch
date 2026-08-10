import { describe, expect, it } from "vitest";

import { SupabaseAchievementsRepository } from "./supabase-achievements-repository.js";
import { createFakeSupabaseClient } from "./test-support/fake-supabase-client.js";

const coupleId = "couple-1";

const coupleRow = (overrides: Record<string, unknown> = {}) => ({
  member_a: "u1",
  member_b: "u2",
  daily_challenge_completions: 0,
  streak: 0,
  message_count: 0,
  ...overrides,
});

const emptyTables = {
  couples: { data: coupleRow(), error: null },
  activities: { data: [], error: null },
  rewards: { data: [], error: null },
  wishlist_items: { data: [], error: null },
  couple_achievements: { data: [], error: null },
};

describe("SupabaseAchievementsRepository", () => {
  it("loads achievement inputs mapped from couple-scoped rows", async () => {
    const { client } = createFakeSupabaseClient({
      userId: "u1",
      tables: {
        couples: {
          data: coupleRow({ daily_challenge_completions: 2, streak: 3, message_count: 10 }),
          error: null,
        },
        activities: {
          data: [
            {
              type: "desafio",
              category: "Hot",
              created_by: "u1",
              created_at: "2026-01-01",
              activity_selections: [
                { user_id: "u1", status: "confirmed", selection_date: "2026-01-01" },
              ],
            },
          ],
          error: null,
        },
        rewards: { data: [{ status: "purchased", cost: 50 }], error: null },
        wishlist_items: { data: [{ status: "gifted" }], error: null },
        couple_achievements: { data: [{ achievement_id: "first_activity" }], error: null },
      },
    });

    const repository = new SupabaseAchievementsRepository(client);
    const inputs = await repository.loadAchievementInputs(coupleId);

    expect(inputs.userId).toBe("u1");
    expect(inputs.partnerId).toBe("u2");
    expect(inputs.coupleData).toEqual({
      dailyChallengeCompletions: 2,
      streak: 3,
      messageCount: 10,
    });
    expect(inputs.allActivities).toEqual([
      {
        type: "desafio",
        category: "Hot",
        createdBy: "u1",
        createdAt: "2026-01-01",
        selections: { u1: { status: "confirmed", date: "2026-01-01" } },
      },
    ]);
    expect(inputs.rewards).toEqual([{ status: "purchased", cost: 50 }]);
    expect(inputs.wishlistItems).toEqual([{ status: "gifted" }]);
    expect(inputs.currentAchievements).toEqual(["first_activity"]);
  });

  it("derives partnerId as whichever couple member isn't the authenticated caller", async () => {
    const { client } = createFakeSupabaseClient({ userId: "u2", tables: emptyTables });

    const repository = new SupabaseAchievementsRepository(client);
    const inputs = await repository.loadAchievementInputs(coupleId);

    expect(inputs.userId).toBe("u2");
    expect(inputs.partnerId).toBe("u1");
  });

  it("upserts newly unlocked achievements for the couple", async () => {
    const { client, upsertCalls } = createFakeSupabaseClient({ userId: "u1", tables: emptyTables });
    const repository = new SupabaseAchievementsRepository(client);

    await repository.persistUnlockedAchievements(coupleId, ["first_activity", "streak_7"]);

    expect(upsertCalls).toEqual([
      {
        table: "couple_achievements",
        rows: [
          { couple_id: coupleId, achievement_id: "first_activity" },
          { couple_id: coupleId, achievement_id: "streak_7" },
        ],
        // ON CONFLICT DO NOTHING semantics: re-persisting an already-unlocked
        // achievement id must not overwrite its existing unlocked_at.
        options: { onConflict: "couple_id,achievement_id", ignoreDuplicates: true },
      },
    ]);
  });

  it("does not write anything when there are no newly unlocked achievements", async () => {
    const { client, upsertCalls } = createFakeSupabaseClient({ userId: "u1", tables: emptyTables });
    const repository = new SupabaseAchievementsRepository(client);

    await repository.persistUnlockedAchievements(coupleId, []);

    expect(upsertCalls).toEqual([]);
  });
});
