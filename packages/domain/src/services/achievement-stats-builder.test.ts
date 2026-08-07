import { describe, expect, it } from "vitest";

import type { Activity, BuildAchievementStatsInput } from "../types.js";

import { buildAchievementStats } from "./achievement-stats-builder.js";

const baseInput: BuildAchievementStatsInput = {
  userId: "u1",
  partnerId: "u2",
};

describe("buildAchievementStats", () => {
  it("returns all-zero stats for empty/default input", () => {
    expect(buildAchievementStats(baseInput)).toEqual({
      totalChallengesCompleted: 0,
      completedActivities: 0,
      completedHotActivities: 0,
      completedHotChallenges: 0,
      currentStreak: 0,
      messagesSent: 0,
      totalPointsSpent: 0,
      wishlistItemsGifted: 0,
    });
  });

  it("counts an activity confirmed by only one side toward challenges but not completedActivities", () => {
    const activity: Activity = {
      type: "desafio",
      selections: { u1: { status: "confirmed" } },
    };
    const stats = buildAchievementStats({ ...baseInput, allActivities: [activity] });
    expect(stats.totalChallengesCompleted).toBe(1);
    expect(stats.completedActivities).toBe(0);
  });

  it("counts an activity confirmed by both toward completedActivities, and completedHotActivities when Hot", () => {
    const activity: Activity = {
      category: "Hot",
      selections: {
        u1: { status: "confirmed" },
        u2: { status: "confirmed" },
      },
    };
    const stats = buildAchievementStats({ ...baseInput, allActivities: [activity] });
    expect(stats.completedActivities).toBe(1);
    expect(stats.completedHotActivities).toBe(1);
  });

  it("counts a Hot challenge confirmed by either side toward completedHotChallenges", () => {
    const activity: Activity = {
      type: "desafio-hot",
      category: "Hot",
      selections: { u2: { status: "confirmed" } },
    };
    const stats = buildAchievementStats({ ...baseInput, allActivities: [activity] });
    expect(stats.completedHotChallenges).toBe(1);
  });

  it("combines challenge count with coupleData.dailyChallengeCompletions", () => {
    const stats = buildAchievementStats({
      ...baseInput,
      coupleData: { dailyChallengeCompletions: 3 },
    });
    expect(stats.totalChallengesCompleted).toBe(3);
  });

  it("sums cost only for purchased rewards, defaulting missing cost to 0", () => {
    const stats = buildAchievementStats({
      ...baseInput,
      rewards: [
        { status: "purchased", cost: 40 },
        { status: "purchased" },
        { status: "pending", cost: 1000 },
      ],
    });
    expect(stats.totalPointsSpent).toBe(40);
  });

  it("counts wishlist items only when gifted or confirmed", () => {
    const stats = buildAchievementStats({
      ...baseInput,
      wishlistItems: [{ status: "gifted" }, { status: "confirmed" }, { status: "pending" }],
    });
    expect(stats.wishlistItemsGifted).toBe(2);
  });

  it("passes streak and messageCount through with 0 defaults", () => {
    const stats = buildAchievementStats({
      ...baseInput,
      coupleData: { streak: 5, messageCount: 12 },
    });
    expect(stats.currentStreak).toBe(5);
    expect(stats.messagesSent).toBe(12);
  });
});
