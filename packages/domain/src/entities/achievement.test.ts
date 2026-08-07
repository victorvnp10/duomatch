import { describe, expect, it } from "vitest";

import type { AchievementStats } from "../types.js";

import { evaluateNewAchievements, getAchievementById } from "./achievement.js";

const zeroStats: AchievementStats = {
  totalChallengesCompleted: 0,
  completedActivities: 0,
  completedHotActivities: 0,
  completedHotChallenges: 0,
  currentStreak: 0,
  messagesSent: 0,
  totalPointsSpent: 0,
  wishlistItemsGifted: 0,
};

describe("evaluateNewAchievements", () => {
  it("returns nothing when no threshold is met", () => {
    expect(evaluateNewAchievements(zeroStats)).toEqual([]);
  });

  it("defaults currentAchievements to an empty list when omitted", () => {
    expect(evaluateNewAchievements(zeroStats)).toEqual([]);
  });

  it("unlocks first_activity and first_match together, since they share the same predicate", () => {
    const stats: AchievementStats = { ...zeroStats, completedActivities: 1 };
    expect(evaluateNewAchievements(stats)).toEqual(
      expect.arrayContaining(["first_activity", "first_match"]),
    );
  });

  it("unlocks every achievement whose threshold is met at once", () => {
    const stats: AchievementStats = {
      ...zeroStats,
      completedActivities: 1,
      currentStreak: 7,
      messagesSent: 50,
    };
    const unlocked = evaluateNewAchievements(stats);
    expect(unlocked).toEqual(
      expect.arrayContaining(["first_activity", "first_match", "streak_7", "communicator"]),
    );
  });

  it("does not re-report an achievement already granted, even if its condition still holds", () => {
    const stats: AchievementStats = { ...zeroStats, completedActivities: 1 };
    const unlocked = evaluateNewAchievements(stats, ["first_activity", "first_match"]);
    expect(unlocked).toEqual([]);
  });

  it.each([
    ["big_spender", { totalPointsSpent: 99 }, { totalPointsSpent: 100 }],
    ["hot_streak", { completedHotActivities: 4 }, { completedHotActivities: 5 }],
    ["wish_granter", { wishlistItemsGifted: 2 }, { wishlistItemsGifted: 3 }],
  ] as const)("unlocks %s exactly at its threshold, not below it", (id, belowDelta, atDelta) => {
    const below: AchievementStats = { ...zeroStats, ...belowDelta };
    const at: AchievementStats = { ...zeroStats, ...atDelta };

    expect(evaluateNewAchievements(below)).not.toContain(id);
    expect(evaluateNewAchievements(at)).toContain(id);
  });
});

describe("getAchievementById", () => {
  it("returns the matching catalog entry for a valid id", () => {
    expect(getAchievementById("streak_7")?.title).toBe("Uma Semana Forte");
  });

  it("returns null for an unknown id", () => {
    expect(getAchievementById("does_not_exist")).toBeNull();
  });
});
